import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, createStreamingChatCompletion } from '@/lib/openai';
import { getDb } from '@/lib/firebase';
import { criticalRules } from '@/lib/criticalRules';

// =============================================================================
// HELPER FUNCTIONS

// Helper 1 Reads a price string and returns the number + whether it's monthly.
function parseBD(text: string): { amount: number; isMonthly: boolean } | null {
  if (!text) return null;
  const isMonthly = /\/mo/i.test(text);
  const match = text.match(/([\d,]+\.?\d*)/);
  if (!match) return null;
  return {
    amount: parseFloat(match[1].replace(/,/g, '')),
    isMonthly,
  };
}

// Helper 2 return full price 
function getFullPrice(product: any): number | null {
  const parsed = parseBD(product.price);
  if (!parsed) return null;
  return parsed.isMonthly ? parsed.amount * 24 : parsed.amount;
}


// Helper 3 Get monthly price
function getMonthlyPrice(product: any): number | null {
  const monthly = parseBD(product.monthlyPrice);
  if (monthly) return monthly.amount;

  const price = parseBD(product.price);
  if (price?.isMonthly) return price.amount;

  return null;
}


// Helper 3 Set Budget 
function detectBudget(userMessages: string[]): {
  min: number | null;
  max: number | null;
  isMonthly: boolean;
} {
  for (const msg of userMessages) {

    // Skip questions about price — user is ASKING, not STATING a budget
    const isQuestion = /\b(how much|does it cost|what.?s the price|will i pay|tell me more)\b/i.test(msg);
    if (isQuestion) continue;

    const isMonthly = /installm|\/mo|per month|monthly/i.test(msg);

    // Pattern 1 — RANGE: "BD 10 to BD 20", "10 - 20 BD", "between BD 10 and BD 20"
    const rangeMatch = msg.match(
      /(?:bd\s*)?([\d,.]+)\s*(?:bd)?\s*(?:to|and|-)\s*(?:bd\s*)?([\d,.]+)/i
    );
    if (rangeMatch) {
      return {
        min: parseFloat(rangeMatch[1].replace(/,/g, '')),
        max: parseFloat(rangeMatch[2].replace(/,/g, '')),
        isMonthly,
      };
    }

    // Pattern 2 — MAX only: "under BD 300", "less than 200", "up to 400"
    const maxMatch =
      msg.match(/(?:under|below|less than|budget|max|up to)\s*(?:bd\s*)?([\d,.]+)/i);

    if (maxMatch) {
      return {
        min: null,
        max: parseFloat(maxMatch[1].replace(/,/g, '')),
        isMonthly,
      };
    }

    // Pattern 3 — AROUND / EXACT: "around BD 300", "bd 300", "300 bd"
    const aroundMatch =
      msg.match(/(?:around|about|approx|approximately|for)\s*(?:bd\s*)?([\d,.]+)/i) ||
      msg.match(/(?:bd\s*)([\d,.]+)/i) ||
      msg.match(/([\d,.]+)\s*bd/i);

    if (aroundMatch) {
      const val = parseFloat(aroundMatch[1].replace(/,/g, ''));
      return {
        min: val * 0.85, // 15% below
        max: val * 1.15, // 15% above
        isMonthly,
      };
    }
  }

  // No budget found in any message
  return { min: null, max: null, isMonthly: false };
}


// Helper 4 Detect category from user messages
function detectCategory(userMessages: string[]): string | null {
  const categoryKeywords: Record<string, string[]> = {
    smartphones:  ['phone', 'mobile', 'iphone', 'samsung', 'galaxy', 'android', 'smartphone'],
    tablets:      ['tablet', 'ipad', 'tab'],
    laptops:      ['laptop', 'notebook', 'macbook', 'computer'],
    smartwatches: ['watch', 'smartwatch'],
    accessories:  ['case', 'charger', 'cable', 'earphone', 'airpod', 'headphone', 'accessory'],
  };

  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => lower.includes(k))) {
        return category;
      }
    }
  }
  return null;
}


//  Helper 5 Checks if a product fits within the user's budget, considering monthly vs full price.
function isProductInBudget(
  product: any,
  min: number | null,
  max: number | null,
  isMonthly: boolean
): boolean {
  // Pick the right price depending on budget type
  const price = isMonthly ? getMonthlyPrice(product) : getFullPrice(product);
  if (price === null) return false; // no matching price available → exclude

  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}




// =============================================================================
// =============================================================================
// =============================================================================
// =============================================================================
// =============================================================================
// =============================================================================


// MAIN API HANDLER




    // STEP 1: RECEIVE REQUEST ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { messages, userData, stream = false, model = 'gpt-4o' } = body;

    const db = getDb();

    // Get user messages only, newest first
    const userMessages: string[] = [...messages]
      .reverse()
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content);

    const lastUserMessage = userMessages[0] || '';


    //  STEP 2: DETECT BUDGET ─────────────────────────────────────────────────
    const { min: budgetMin, max: budgetMax, isMonthly: isMonthlyQuery } = detectBudget(userMessages);
    const budgetWasSet = budgetMin !== null || budgetMax !== null;


    //  STEP 3: DETECT CATEGORY ───────────────────────────────────────────────
    const requestedCategory = detectCategory(userMessages);


    //  STEP 4: FETCH + FILTER PRODUCTS ──────────────────────────────────────
    const productsSnapshot = await db.collection('products').limit(500).get();
    let products = productsSnapshot.docs
      .map(doc => doc.data())
      .filter(p => !/\btest\b/i.test(p.name || '')); // remove dummy/test products

    // Filter A — Category
    if (requestedCategory) {
      products = products.filter(p => {
        const cat  = `${p.category || ''} ${p.categoryLabel || ''}`.toLowerCase();
        const name = (p.name || '').toLowerCase();

        if (requestedCategory === 'smartphones') {
          const isPhone = /smartphone|mobile|phone/i.test(cat) ||
            /\biphone\b|\bgalaxy\b|\bpixel\b|\bxiaomi\b|\boppo\b|\brealme\b|\boneplus\b|\bnokia\b|\bhuawei\b|\bhonor\b|\bvivo\b|\bsony\b/i.test(name);
          const isNotPhone = /tv\b|laptop|tablet|ipad|watch|earphone|charger|case|router|accessory/i.test(name);
          return isPhone && !isNotPhone;
        }
        if (requestedCategory === 'tablets')      return /tablet|ipad/i.test(cat);
        if (requestedCategory === 'laptops')      return /laptop|notebook/i.test(cat);
        if (requestedCategory === 'smartwatches') return /watch/i.test(cat);
        if (requestedCategory === 'accessories')  return /access/i.test(cat);
        return true;
      });
    }

    // Filter B — Budget (one clean function call per product)
    if (budgetWasSet) {
      products = products.filter(p =>
        isProductInBudget(p, budgetMin, budgetMax, isMonthlyQuery)
      );
    }

    // Filter C — Remove already-shown products when user says "show more"
    const isMoreRequest = /\b(more|next|another|show more|what else|any other)\b/i.test(lastUserMessage);
    if (isMoreRequest) {
      const shownText = messages
        .filter((m: any) => m.role === 'assistant')
        .map((m: any) => m.content.toLowerCase())
        .join('\n');

      products = products.filter(p => {
        const key = `${p.brand || ''} ${p.name || ''}`.toLowerCase().trim();
        return !shownText.includes(key);
      });
    }

    // ── STEP 5: FETCH PLANS, PERSONA, KNOWLEDGE ───────────────────────────────
    const plansSnapshot = await db.collection('plans').limit(200).get();
    const plans = plansSnapshot.docs.map(doc => doc.data());

    // Persona from Firebase (admin-editable from /admin/rules)
    const configDoc = await db.collection('config').doc('systemPrompt').get();
    const personaPrompt = configDoc.exists && configDoc.data()?.content
      ? configDoc.data()!.content
      : `You are Zaina, a friendly and helpful AI shopping assistant for Zain Bahrain's e-commerce store.

Your role:
- Help customers find phones, tablets, laptops, smartwatches, accessories, vouchers, gift cards, home solutions, gaming products, and plans from Zain Bahrain
- Provide product recommendations based on their needs and budget
- Answer questions about devices, specifications, and plans
- Be conversational, friendly, and enthusiastic about technology
- Always mention prices in Bahraini Dinars (BD)`;

    const baseSystemPrompt = personaPrompt + criticalRules;

    const knowledgeSnapshot = await db.collection('knowledge').limit(100).get();
    let knowledgeContext = '';
    if (!knowledgeSnapshot.empty) {
      const queryWords = lastUserMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const relevantDocs = knowledgeSnapshot.docs
        .map(doc => doc.data())
        .filter(data => {
          const docText = `${data.title || ''} ${data.content || ''}`.toLowerCase();
          return queryWords.some(w => docText.includes(w));
        });

      if (relevantDocs.length > 0) {
        const MAX_CHARS = 1500;
        knowledgeContext = '\n\n=== REFERENCE KNOWLEDGE BASE ===\n' +
          relevantDocs.map(data => {
            const body = (data.content || '').slice(0, MAX_CHARS);
            const truncated = (data.content?.length || 0) > MAX_CHARS
              ? '\n[Truncated — summarize key points concisely.]' : '';
            return `Title: ${data.title}\nContent:\n${body}${truncated}`;
          }).join('\n\n') +
          '\n=== END OF REFERENCE KNOWLEDGE BASE ===';
      }
    }


    // ── STEP 6: BUILD THE SYSTEM MESSAGE ─────────────────────────────────────
    // This is the full instruction manual GPT reads before answering.
    // It contains: who Zaina is + rules + budget context + products + plans.

    // Full inventory section
    const productContext = products.length > 0
      ? (() => {
          const unique = Array.from(
            new Map(products.map(p => [`${p.category}-${p.brand}-${p.name}`, p])).values()
          );
          const grouped: Record<string, typeof unique> = {};
          unique.forEach(p => {
            const key = p.categoryLabel || p.category || 'Other';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
          });
          const tag = budgetWasSet ? ' [CONFIRMED WITHIN CUSTOMER BUDGET]' : '';
          return '\n\n=== AVAILABLE PRODUCTS IN INVENTORY ===\n' +
            Object.entries(grouped).map(([cat, items]) =>
              `[${cat}]\n` + items.map(p =>
                `  • ${p.brand} ${p.name} | Price: ${p.price}` +
                (p.monthlyPrice && p.monthlyPrice !== p.price ? ` | Monthly: ${p.monthlyPrice}` : '') +
                (p.savings ? ` | Offer: ${p.savings}` : '') + tag
              ).join('\n')
            ).join('\n\n') +
            '\n=== END OF INVENTORY ===';
        })()
      : '\n\n=== AVAILABLE PRODUCTS IN INVENTORY ===\n[NO PRODUCTS MATCH — DO NOT INVENT ANY.]\n=== END OF INVENTORY ===';

    // Plans section
    const plansContext = plans.length > 0
      ? (() => {
          const grouped: Record<string, typeof plans> = {};
          plans.forEach(p => {
            const key = `${p.category} / ${p.subCategory}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
          });
          const unlimitedPlans = plans.filter(p => /unlimited/i.test(p.data || ''));
          const unlimitedNote = unlimitedPlans.length > 0
            ? `\n⚠️ UNLIMITED PLANS: ${unlimitedPlans.map(p => p.name).join(', ')} — recommend first for unlimited requests.`
            : `\nNOTE: No plans have Unlimited data. Do not claim otherwise.`;
          return '\n\n=== AVAILABLE PLANS ===' + unlimitedNote + '\n' +
            Object.entries(grouped).map(([group, groupPlans]) =>
              `[${group}]\n` + groupPlans.map(p =>
                `  • ${p.name} – ${p.price}/month` +
                (p.data ? ` | Data: ${p.data}` : '') +
                (p.banner ? ` | Offer: ${p.banner}` : '')
              ).join('\n')
            ).join('\n\n') +
            '\n=== END OF PLANS ===';
        })()
      : '';

    // Budget note — tells GPT how the products were already filtered
    const budgetNote = budgetWasSet
      ? isMonthlyQuery
        ? `\n\nNOTE: Customer's monthly budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}/month. Products are pre-filtered by monthly price. Compare ONLY monthly price — never the full price.`
        : `\n\nNOTE: Customer's cash budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}. Products are pre-filtered. Do NOT suggest anything outside this list.`
      : '';

    // Show more note
    const moreNote = isMoreRequest
      ? `\n\nNOTE: Customer wants MORE options. Inventory is updated to show only products not yet shown. Present up to 3. If more remain, say so.`
      : `\n\nNOTE: There are ${products.length} product(s) available. Show up to 3. If more remain, let the customer know.`;

    // Mandatory follow-up reminder
    const followUpReminder = `\n\n⚠️ MANDATORY: End EVERY response with a relevant follow-up question. No exceptions.`;

    // Final assembled system message
    const systemMessage = {
      role: 'system' as const,
      content: baseSystemPrompt
        + budgetNote
        + moreNote
        + knowledgeContext
        + productContext
        + plansContext
        + followUpReminder,
    };


    // ── STEP 7: EARLY RETURN IF NO PRODUCTS FOUND ─────────────────────────────
    if (budgetWasSet && products.length === 0) {
      const noResultMsg = isMoreRequest
        ? `That's everything we have in that range. Would you like to explore a different price range or category?`
        : isMonthlyQuery
          ? `I'm sorry, we don't have any products with a monthly installment ${budgetMin && budgetMax ? `between BD ${budgetMin} and BD ${budgetMax}` : `up to BD ${budgetMax}`}. Would you like to try a different range?`
          : `I'm sorry, we don't have any products under BD ${budgetMax}. Would you like to explore a higher budget or a different category?`;

      const chatId = userData?.phone
        ? `${userData.phone}_${(userData.name || '').replace(/\s+/g, '_')}`
        : `anon_${Date.now()}`;

      db.collection('chats').doc(chatId).set({
        userData: userData || { name: 'Anonymous', phone: 'unknown' },
        messages: [...messages, { role: 'assistant', content: noResultMsg }],
        updatedAt: new Date(),
        needsLearning: false,
      }, { merge: true }).catch(console.error);

      return NextResponse.json({ message: noResultMsg });
    }


    // ── STEP 8: CALL OPENAI ───────────────────────────────────────────────────
  
    const fullMessages = [systemMessage, ...messages];

    if (stream) {
      const streamObj = await createStreamingChatCompletion(fullMessages, model);
      return new Response(streamObj.toReadableStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const response = await createChatCompletion(fullMessages, model, 0.3);
    const assistantReply = response.choices[0]?.message?.content || '';


    // ── STEP 9: DETECT IF GPT WAS CONFUSED ───────────────────────────────────
    const confusedPhrases = [
      /i('m| am) (not able|unable) to (help|answer|assist)/i,
      /that('s| is) (outside|beyond) (my|our)/i,
      /i don't have (that |any )?information/i,
      /i can'?t (help|answer|assist) (with )?that/i,
      /i'?m not sure (how to|what you|about that)/i,
    ];
    const needsLearning = confusedPhrases.some(pattern => pattern.test(assistantReply));


    // ── STEP 10: SAVE CONVERSATION TO FIREBASE ────────────────────────────────
    const chatId = userData?.phone
      ? `${userData.phone}_${(userData.name || '').replace(/\s+/g, '_')}`
      : `anon_${Date.now()}`;

    const chatData: Record<string, unknown> = {
      userData: userData || { name: 'Anonymous', phone: 'unknown' },
      messages: [...messages, { role: 'assistant', content: assistantReply }],
      updatedAt: new Date(),
      needsLearning,
    };

    if (needsLearning) {
      chatData.needsLearningMsg = lastUserMessage;
      chatData.resolvedAt = null;
    }

    db.collection('chats').doc(chatId).set(chatData, { merge: true })
      .catch(err => console.error('Failed to save chat:', err));


    // ── STEP 11: RETURN REPLY TO FRONTEND ────────────────────────────────────
    return NextResponse.json({
      message: assistantReply,
      model: response.model,
      usage: response.usage,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}