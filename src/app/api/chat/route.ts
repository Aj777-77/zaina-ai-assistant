import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, createStreamingChatCompletion, getOpenAI } from '@/lib/openai';
import { getDb } from '@/lib/firebase';
import { criticalRules } from '@/lib/criticalRules';


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Helper 1 — Parse a BD price string into { amount, isMonthly }.
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

// Helper 2 — Resolve a product's full cash price (converts monthly→cash+VAT if needed).
function getFullPrice(product: any): number | null {
  const parsed = parseBD(product.price);
  if (!parsed) return null;
  return parsed.isMonthly ? (parsed.amount * 24) * 1.1 : parsed.amount;
}

// Helper 3 — Resolve a product's monthly installment price (if any).
function getMonthlyPrice(product: any): number | null {
  const monthly = parseBD(product.monthlyPrice);
  if (monthly) return monthly.amount;

  const price = parseBD(product.price);
  if (price?.isMonthly) return price.amount;

  return null;
}

// Helper 4 — AI intent parser. Extracts category + budget from user messages.
async function analyzeUserIntent(messages: string[]): Promise<{
  category: string | null;
  budget: { min: number | null; max: number | null; isMonthly: boolean } | null;
}> {
  try {
    const openai = getOpenAI();

    const conversation = [...messages].reverse().map((m, i) => `[Msg ${i + 1}]: ${m}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert commerce search assistant. Extract the requested product category and budget constraints from the user's sequential messages.
Return strictly a valid JSON object matching this exact shape:
{
  "category": "smartphones" | "tablets" | "laptops" | "smartwatches" | "accessories" | "tvs" | "gaming" | null,
  "budget": {
    "min": number | null,
    "max": number | null,
    "isMonthly": boolean
  } | null
}

RULES:
1. "category" MUST be one of those exact strings, or null. PS5 = "gaming".
2. If the user states a specific new flagship/expensive product name in their final message (like "iPhone 17") without re-stating a budget, set "budget" to null so it doesn't get hidden.
3. If they say "cheaper", figure out the previously understood max budget, and return a significantly lower max.
4. Handle conversational misunderstandings correctly. If they say "how much in case", that means "how much in cash" (prices). DO NOT trigger the "accessories" category just because of the word "case".
5. If the user asks for screens, monitors, or displays (even for gaming), map the category to "tvs".
6. A budget stated as a single number (e.g. "my budget is BD 30") always means MAX only — set min to null, max to that number. NEVER set min equal to max.
7. If the user's LAST message does NOT mention a price, budget, or cost (e.g. they're just asking "what cases do you have?" or "show me tablets"), set "budget" to null. Do NOT carry forward a budget from earlier in the conversation when the user is simply browsing without re-stating a budget.
8. USE-CASE vs CATEGORY: When a user asks for a DEVICE for a USE CASE (e.g. "phone for gaming", "tablet for streaming", "laptop for work", "watch for fitness"), the category is the DEVICE TYPE, NOT the use case. So "phone for gaming" → "smartphones" (NOT "gaming"). The "gaming" category is reserved for gaming consoles/hardware only (PS5, Xbox, Nintendo).
9. PAY CLOSE ATTENTION TO THE LATEST MESSAGE: The highest message number is the user's newest request. If they change their mind from an earlier message (e.g. from "ipad" to "iphone"), the new category MUST be extracted ("smartphones").
10. MONTHLY INFERENCE FOR EXPENSIVE DEVICES: When category is "smartphones", "tablets", or "laptops" AND the user's budget max is BD 100 or less (e.g. "budget of 30 BD", "under 50 BD") without explicit "cash"/"full price"/"outright" wording, set "isMonthly": true. Reason: these devices always cost hundreds of BD in cash, so a small number MUST be a monthly installment budget. Only set isMonthly:false if they explicitly say "cash", "full price", "outright", or "no installment".
11. OUTPUT STRICT JSON ONLY.`
        },
        {
          role: 'user',
          content: conversation,
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      category: parsed.category || null,
      budget: parsed.budget || null,
    };

  } catch (err) {
    console.error('Failed to parse intent AI:', err);
    return { category: null, budget: null };
  }
}

// Helper 5 — Check whether a product falls inside a budget range.
function isProductInBudget(
  product: any,
  min: number | null,
  max: number | null,
  isMonthly: boolean
): boolean {
  const price = isMonthly ? getMonthlyPrice(product) : getFullPrice(product);
  if (price === null) return false;

  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN API HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {

    // ── Step 1: Receive request from frontend ────────────────────────────────
    const body = await request.json();
    const { messages, userData, stream = false, model = 'gpt-4o' } = body;

    const db = getDb();

    const userMessages: string[] = [...messages]
      .reverse()
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content);

    const lastUserMessage = userMessages[0] || '';


    // ── Step 2: Detect what the user wants (AI-based intent parsing) ─────────
    const { category: requestedCategory, budget } = await analyzeUserIntent(userMessages);

    const budgetMin      = budget?.min ?? null;
    const budgetMax      = budget?.max ?? null;
    let   isMonthlyQuery = budget?.isMonthly ?? false;
    const budgetWasSet   = budgetMin !== null || budgetMax !== null;

    // Safety net: if the intent AI forgot rule 10, coerce isMonthly to true
    // when the budget is implausibly low for a cash purchase of an expensive
    // device. "Budget of BD 30" for a phone/tablet/laptop is always monthly
    // in Bahrain — nothing in those categories costs BD 30 cash.
    const expensiveDeviceCats = new Set(['smartphones', 'tablets', 'laptops']);
    const lastMessageLower = lastUserMessage.toLowerCase();
    const userExplicitlySaidCash = /\b(cash|full\s*price|outright|no\s*installment)\b/.test(lastMessageLower);
    if (
      !isMonthlyQuery &&
      !userExplicitlySaidCash &&
      requestedCategory &&
      expensiveDeviceCats.has(requestedCategory) &&
      budgetMax !== null &&
      budgetMax <= 100
    ) {
      isMonthlyQuery = true;
    }


    // ── Step 3: Fetch + filter products from Firestore ───────────────────────
    const productsSnapshot = await db.collection('products').limit(500).get();
    let products = productsSnapshot.docs
      .map(doc => doc.data())
      .filter(p => !/\btest\b/i.test(p.name || ''));

    // Filter 1 — Category.
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
        if (requestedCategory === 'tablets')      return /tablet|ipad/i.test(cat) || /tablet|ipad/i.test(name);
        if (requestedCategory === 'laptops')      return /laptop|notebook|macbook/i.test(name) || (/laptop/i.test(cat) && !/ipad|tablet|mac mini|imac/i.test(name));
        if (requestedCategory === 'smartwatches') return /watch/i.test(cat);
        if (requestedCategory === 'accessories')  return /access/i.test(cat);
        if (requestedCategory === 'tvs')          return /tv|television|screen|display|monitor|gaming|console/i.test(cat) || /tv|ps5|playstation|xbox|monitor/i.test(name);
        if (requestedCategory === 'gaming')       return /gaming|console|ps5|playstation|xbox|nintendo|tv|television|screen|monitor/i.test(cat) || /ps5|playstation|xbox|nintendo|tv|monitor/i.test(name);
        return true;
      });
    }

    // Filter 2 — Budget.
    if (budgetWasSet) {
      products = products.filter(p =>
        isProductInBudget(p, budgetMin, budgetMax, isMonthlyQuery)
      );
    }

    // Filter 3 — Drop already-shown products when the user asks for more.
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


    // ── Step 4: Fetch plans, persona, and knowledge docs from Firestore ──────
    const plansSnapshot = await db.collection('plans').limit(200).get();
    const plans = plansSnapshot.docs.map(doc => doc.data());

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

    // Keyword-match knowledge docs against the user's current query + previous reply.
    if (!knowledgeSnapshot.empty) {
      const prevAssistantMsg = messages.length > 1 && messages[messages.length - 2].role === 'assistant'
        ? messages[messages.length - 2].content
        : '';
      const combinedContext = `${lastUserMessage} ${prevAssistantMsg}`;

      const stopWords = new Set(['this', 'that', 'with', 'your', 'have', 'from', 'what', 'about', 'like', 'there', 'some', 'when', 'then', 'would', 'could', 'should', 'plan', 'price', 'month', 'data', 'available', 'currently', 'within', 'budget', 'anything', 'else', 'assist', 'proceed', 'upgrade', 'higher', 'offers', 'fits', 'sure', 'here', 'these', 'those']);
      const queryWords = combinedContext.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length > 3 && !stopWords.has(w));

      const relevantDocs = knowledgeSnapshot.docs
        .map(doc => doc.data())
        .map(data => {
          const docText = `${data.title || ''} ${data.content || ''}`.toLowerCase();
          const matchCount = queryWords.reduce((count, w) => docText.includes(w) ? count + 1 : count, 0);
          return { data, matchCount };
        })
        .filter(doc => doc.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 4)
        .map(doc => doc.data);

      if (relevantDocs.length > 0) {
        const MAX_CHARS = 1000;
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


    // ── Step 5: Build the system message ─────────────────────────────────────

    // 5.1 — Product context: deduped, grouped by category, budget-tagged.
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
                (p.savings ? ` | Offer: ${p.savings}` : '') +
                tag
              ).join('\n')
            ).join('\n\n') +
            '\n=== END OF INVENTORY ===\n\nCRITICAL ANTI-HALLUCINATION RULE: You must ONLY recommend products, prices, and plans that are explicitly listed above in the INVENTORY. NEVER invent, guess, or pull products from your general pre-trained knowledge. If a user asks for a device not in the list, explicitly tell them it is not currently in stock.';
        })()
      : '\n\n=== AVAILABLE PRODUCTS IN INVENTORY ===\n[NO PRODUCTS MATCH — DO NOT INVENT ANY.]\n=== END OF INVENTORY ===';

    // 5.2 — Plans context: grouped by category/subCategory, flagged for unlimited data.
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
                (p.data   ? ` | Data: ${p.data}`     : '') +
                (p.banner ? ` | Offer: ${p.banner}`  : '')
              ).join('\n')
            ).join('\n\n') +
            '\n=== END OF PLANS ===';
        })()
      : '';

    // 5.3 — Budget note (monthly vs cash framing, or empty).
    const budgetNote = budgetWasSet
      ? isMonthlyQuery
        ? `\n\nNOTE: Customer's monthly budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}/month. Products are pre-filtered by monthly price. Plans are NOT pre-filtered — if customer wants phone + plan, do the math: (Phone Monthly + Plan Monthly) must not exceed total budget.`
        : `\n\nNOTE: Customer's cash budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}. Products are pre-filtered. Do NOT suggest anything outside this list.`
      : '';

    // 5.4 — More-options note (pagination instruction for GPT).
    const moreNote = isMoreRequest
      ? `\n\nNOTE: Customer wants MORE options. Inventory is updated to show only products not yet shown. Present up to 3. If more remain, say so.`
      : `\n\nNOTE: There are ${products.length} product(s) in the inventory below. Show up to 3. If more remain, let the customer know.`;

    // 5.5 — Assemble the final system message.
    const systemMessage = {
      role: 'system' as const,
      content: baseSystemPrompt    // 1. Who Zaina is + all hardcoded rules
        + budgetNote               // 2. Budget context (or empty if no budget)
        + moreNote                 // 3. Product count + show-more instruction
        + knowledgeContext         // 4. Relevant admin-taught Q&As (or empty)
        + productContext           // 5. The full filtered product inventory
        + plansContext             // 6. All available plans (or empty)
    };


    // ── Step 6: Safety check — no products found ─────────────────────────────
    // Fires whenever a category was requested but 0 matches survived filtering.
    // Without this, GPT gets an empty inventory block and hallucinates popular
    // products from its pre-training (iPhone 16, Galaxy S23/S25, etc.).
    if (requestedCategory && products.length === 0) {
      const categoryLabel =
        requestedCategory === 'smartphones'  ? 'phones'
      : requestedCategory === 'tvs'          ? 'TVs'
      : requestedCategory === 'gaming'       ? 'gaming products'
      : requestedCategory;

      const noResultMsg = isMoreRequest
        ? `That's everything we have in that range. Would you like to explore a different price range or category?`
        : budgetWasSet
          ? isMonthlyQuery
            ? `I'm sorry, we don't have any ${categoryLabel} with a monthly installment ${budgetMin !== null && budgetMax !== null && budgetMin !== budgetMax ? `between BD ${budgetMin} and BD ${budgetMax}` : `up to BD ${budgetMax ?? budgetMin}`}/month. Would you like to try a different range?`
            : `I'm sorry, we don't have any ${categoryLabel} ${budgetMin !== null && budgetMax !== null && budgetMin !== budgetMax ? `between BD ${budgetMin} and BD ${budgetMax}` : `under BD ${budgetMax ?? budgetMin}`}. Would you like to explore a different budget or category?`
          : `I'm sorry, we don't currently have any ${categoryLabel} in stock. Would you like to explore a different category?`;

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


    // ── Step 7: Call OpenAI ──────────────────────────────────────────────────
    // The inventory is duplicated into a SECOND system message placed AFTER
    // the user/assistant history. GPT's attention is strongest on recent
    // context, so repeating the inventory at the end dramatically reduces
    // the chance it falls back to pre-trained product names.
    const inventoryNames = Array.from(
      new Set(
        products
          .map(p => `${p.brand || ''} ${p.name || ''}`.trim())
          .filter(Boolean)
      )
    );

    const inventoryReminder = {
      role: 'system' as const,
      content:
        'FINAL AUTHORITATIVE CHECK — READ BEFORE RESPONDING:\n' +
        'You must ONLY recommend products from this exact list of names:\n' +
        inventoryNames.map(n => `  • ${n}`).join('\n') +
        '\n\nRULES:\n' +
        '1. Any product name not in this list (e.g. Galaxy S23/S24, Fold5, Flip5, iPhone 14/15/16, or anything you remember from training data) MUST NOT appear in your response.\n' +
        '2. USE-CASE REQUESTS: When the customer asks for a device for a USE CASE (e.g. "phone for gaming", "phone for photography", "tablet for streaming"), DO NOT say "we don\'t have a gaming phone" or "no phone is labeled for gaming". Instead, pick the best-fit devices from the list above and explain why they suit that use case (e.g. for gaming, recommend the highest-performance flagship phones; for photography, recommend phones with strong camera reputation). EVERY device in the list is a real phone/tablet — the use case is a preference, not a separate category.\n' +
        '3. Verify every product name you type against this list — no exceptions.\n' +
        '4. FORMATTING: NEVER use formatting stars/asterisks (* or **) in your response. Do not use them for bolding, bullet points, or italics. Respond with plain text only.',
    };

    const fullMessages = [systemMessage, ...messages, inventoryReminder];

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

    const response = await createChatCompletion(fullMessages, model, 0.4);
    const assistantReply = response.choices[0]?.message?.content || '';


    // ── Step 8: Detect if GPT was confused (flag for admin review) ───────────
    const confusedPhrases = [
      /i('m| am) (not able|unable) to (help|answer|assist)/i,
      /that('s| is) (outside|beyond) (my|our)/i,
      /i don't have (that |any )?information/i,
      /i can'?t (help|answer|assist) (with )?that/i,
      /i'?m not sure (how to|what you|about that)/i,
    ];
    const needsLearning = confusedPhrases.some(pattern => pattern.test(assistantReply));


    // ── Step 9: Save conversation to Firestore ───────────────────────────────
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


    // ── Step 10: Return GPT's reply to the frontend ──────────────────────────
    return NextResponse.json({
      message: assistantReply,
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
