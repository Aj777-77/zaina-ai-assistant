import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, createStreamingChatCompletion, getOpenAI } from '@/lib/openai';
import { getDb } from '@/lib/firebase';
import { criticalRules } from '@/lib/criticalRules';


// HELPER 1 — PRICE HELPER FUNCTIONS
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


// HELPER 2 — GET FULL PRICE

function getFullPrice(product: any): number | null {
  const parsed = parseBD(product.price);
  if (!parsed) return null;
  return parsed.isMonthly ? parsed.amount * 24 : parsed.amount;
}

// HELPER 3 — GET MONTHLY PRICE
function getMonthlyPrice(product: any): number | null {
  const monthly = parseBD(product.monthlyPrice);
  if (monthly) return monthly.amount;

  const price = parseBD(product.price);
  if (price?.isMonthly) return price.amount;

  return null;
}

// HELPER 4 — AI INTENT PARSER

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
      response_format: { type: 'json_object' }, // force JSON output
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
OUTPUT STRICT JSON ONLY.`
        },
        {
          role: 'user',
          content: conversation,
        }
      ]
    });

    // Parse the JSON string GPT returned
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



 // HELPER 5 — CHECK IF A PRODUCT FITS THE BUDGET
function isProductInBudget(
  product: any,
  min: number | null,
  max: number | null,
  isMonthly: boolean
): boolean {
  const price = isMonthly ? getMonthlyPrice(product) : getFullPrice(product);
  if (price === null) return false; // product has no usable price → exclude it

  if (min !== null && price < min) return false; // too cheap
  if (max !== null && price > max) return false; // too expensive
  return true;
}


// MAIN API HANDLER
// ================================================================================


    // ── STEP 1: RECEIVE REQUEST FROM FRONTEND ────────────────────────────────
export async function POST(request: NextRequest) {
  try {

   
    const body = await request.json();
    const { messages, userData, stream = false, model = 'gpt-4o' } = body;

    const db = getDb(); 

    const userMessages: string[] = [...messages]
      .reverse()
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content);

    const lastUserMessage = userMessages[0] || ''; 


    // ── STEP 2: DETECT WHAT THE USER WANTS (AI-BASED INTENT PARSING) ─────────
    
    const { category: requestedCategory, budget } = await analyzeUserIntent(userMessages);

    // Unpack budget values — use null if not detected
    const budgetMin       = budget?.min  ?? null;
    const budgetMax       = budget?.max  ?? null;
    const isMonthlyQuery  = budget?.isMonthly ?? false;
    const budgetWasSet    = budgetMin !== null || budgetMax !== null;


    // ── STEP 3: FETCH + FILTER PRODUCTS FROM FIREBASE ────────────────────────
    const productsSnapshot = await db.collection('products').limit(500).get();
    let products = productsSnapshot.docs
      .map(doc => doc.data())
      .filter(p => !/\btest\b/i.test(p.name || '')); 

    //  Filter 1: Category 
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

    // ── Filter 2: Budget ──────────────────────────────────────────────────────
    if (budgetWasSet) {
      products = products.filter(p =>
        isProductInBudget(p, budgetMin, budgetMax, isMonthlyQuery)
      );
    }

    // ── Filter 3: Remove already-shown products ───────────────────────────────
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


    // ── STEP 4: FETCH PLANS, PERSONA, AND KNOWLEDGE DOCS FROM FIREBASE ────────

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

    //Filter knowledge based on user's current query 
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


// STEP 5 — BUILD THE SYSTEM MESSAGE


//
//   5.2  Build plansContext
//        → Group plans by category / subCategory
//        → Check if any plan has "Unlimited" data
//        → Convert to a readable text string
//        → If no plans → empty string (nothing added)
//
//   5.3  Build budgetNote
//        → If a budget was detected → tell GPT the budget and that
//          products are already pre-filtered (so GPT knows why list is short)
//        → If monthly budget → also warn GPT plans are NOT filtered
//          (so GPT must do the math: phone monthly + plan monthly ≤ budget)
//        → If no budget → empty string (nothing added)
//
//   5.4  Build moreNote
//        → If user asked for "more" → tell GPT inventory shows only new products
//        → Otherwise → tell GPT how many products are in the list
//          and to show max 3 at a time
//
//   5.5  Build followUpReminder
//        → A mandatory instruction: always end every reply with a question
//
//   5.6  Assemble everything into ONE systemMessage object
//        → role: 'system' (OpenAI reads this before user messages)
//        → content: all 7 pieces joined together as one long string
//
// ================================================================================


// ── 5.1  PRODUCT CONTEXT 

const productContext = products.length > 0
  ? (() => {
      // ── Remove duplicates 
      const unique = Array.from(
        new Map(products.map(p => [`${p.category}-${p.brand}-${p.name}`, p])).values()
      );

      // ── Group by category 
      // grouped = { "Smartphones": [p1, p2], "Tablets": [p3], ... }
      const grouped: Record<string, typeof unique> = {};
      unique.forEach(p => {
        const key = p.categoryLabel || p.category || 'Other';
        if (!grouped[key]) grouped[key] = [];   // create array if first product in this category
        grouped[key].push(p);
      });

// ── 5.2 Budget tag 
      const tag = budgetWasSet ? ' [CONFIRMED WITHIN CUSTOMER BUDGET]' : '';

      // ── Build the text string 
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


// ── 5.3  PLANS CONTEXT 
const plansContext = plans.length > 0
  ? (() => {

      // ── Group plans by category 
      const grouped: Record<string, typeof plans> = {};
      plans.forEach(p => {
        const key = `${p.category} / ${p.subCategory}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });

      // ── Detect unlimited plans 
      const unlimitedPlans = plans.filter(p => /unlimited/i.test(p.data || ''));
      const unlimitedNote = unlimitedPlans.length > 0
        ? `\n⚠️ UNLIMITED PLANS: ${unlimitedPlans.map(p => p.name).join(', ')} — recommend first for unlimited requests.`
        : `\nNOTE: No plans have Unlimited data. Do not claim otherwise.`;

      // ── Build the text string 
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


// ── 5.4  BUDGET NOTE 

const budgetNote = budgetWasSet
  ? isMonthlyQuery
    // Monthly budget note
    ? `\n\nNOTE: Customer's monthly budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}/month. Products are pre-filtered by monthly price. Plans are NOT pre-filtered — if customer wants phone + plan, do the math: (Phone Monthly + Plan Monthly) must not exceed total budget.`
    // Cash budget note
    : `\n\nNOTE: Customer's cash budget is ${budgetMin ? `BD ${budgetMin} to ` : 'up to '}BD ${budgetMax}. Products are pre-filtered. Do NOT suggest anything outside this list.`
  // No budget detected → add nothing
  : '';


// ── 5.4  MORE NOTE ───────────────────────────────────────────────────────────

const moreNote = isMoreRequest
  ? `\n\nNOTE: Customer wants MORE options. Inventory is updated to show only products not yet shown. Present up to 3. If more remain, say so.`
  : `\n\nNOTE: There are ${products.length} product(s) in the inventory below. Show up to 3. If more remain, let the customer know.`;


// ── 5.5  FOLLOW-UP REMINDER ──────────────────────────────────────────────────
const followUpReminder = `\n\n⚠️ MANDATORY: End EVERY response with a relevant follow-up question. No exceptions.`;


// ── 5.6  ASSEMBLE THE FINAL SYSTEM MESSAGE ───────────────────────────────────
//
// FLOW:
//   All 7 pieces are joined together using + (string concatenation)
//   The result is stored as role: 'system'
//   This is what OpenAI receives FIRST before the user's messages
//
// ORDER MATTERS:
//   1. baseSystemPrompt  → who Zaina is (must come first, sets the identity)
//   2. budgetNote        → budget context (before products so GPT understands the list)
//   3. moreNote          → product count rule (before products so GPT knows how many)
//   4. knowledgeContext  → relevant Q&As (before products so GPT has extra context)
//   5. productContext    → the actual product list (the main catalog)
//   6. plansContext      → plans list (after products, separate section)
//   7. followUpReminder  → LAST, so it's the final instruction GPT reads before answering
//
// WHY role: 'system' as const?
//   OpenAI's API only accepts exactly: 'system' | 'user' | 'assistant'
//   TypeScript without "as const" would type this as just "string" which is too broad.
//   "as const" narrows the type to the exact literal value 'system'.

const systemMessage = {
  role: 'system' as const,
  content: baseSystemPrompt    // 1. Who Zaina is + all hardcoded rules
    + budgetNote               // 2. Budget context (or empty if no budget)
    + moreNote                 // 3. Product count + show-more instruction
    + knowledgeContext         // 4. Relevant admin-taught Q&As (or empty)
    + productContext           // 5. The full filtered product inventory
    + plansContext             // 6. All available plans (or empty)
    + followUpReminder,        // 7. Always end with a question (last instruction)
};

// ── WHAT GPT RECEIVES ────────────────────────────────────────────────────────
// The systemMessage above becomes the first item in the messages array sent to OpenAI:
//
//   [systemMessage, ...conversationHistory]
//
//   [0] role:'system'    → the entire instruction manual built above
//   [1] role:'assistant' → "Hello! I'm Zaina..."  (initial greeting)
//   [2] role:'user'      → "Show me phones under BD 300"
//   [3] role:'assistant' → "Here are 3 phones..."
//   [4] role:'user'      → "Show me more"   ← newest message
//
// GPT reads them in order — system first, then the conversation.
// This is how GPT knows it's Zaina, what products exist, and what rules to follow.
// ================================================================================

    // ── STEP 6: SAFETY CHECK — NO PRODUCTS FOUND ─────────────────────────────
    // If a budget was set but the filter returned zero products,
    // we skip GPT entirely and return a pre-written "sorry" message.
    //
    // WHY skip GPT here?
    // If we call GPT with an empty inventory list, it might invent products
    // that don't exist ("we have a great Zain Basic Phone for BD 45!").
    // Returning a hardcoded message is safer and faster.
    if (budgetWasSet && products.length === 0) {
      const noResultMsg = isMoreRequest
        ? `That's everything we have in that range. Would you like to explore a different price range or category?`
        : isMonthlyQuery
          ? `I'm sorry, we don't have any products with a monthly installment ${budgetMin && budgetMax ? `between BD ${budgetMin} and BD ${budgetMax}` : `up to BD ${budgetMax}`}. Would you like to try a different range?`
          : `I'm sorry, we don't have any products under BD ${budgetMax}. Would you like to explore a higher budget or a different category?`;

      // Still save this conversation so admin can see it
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


    // ── STEP 7: CALL OPENAI ───────────────────────────────────────────────────
    // We combine [systemMessage, ...all previous messages] and send to GPT.
    //
    // GPT reads them in order:
    //   [0] system    → "You are Zaina... [products] [plans] [rules]"  ← read first
    //   [1] assistant → "Hello! I'm Zaina..."                          ← initial greeting
    //   [2] user      → "Show me phones under BD 300"
    //   [3] assistant → "Here are 3 phones..."
    //   [4] user      → "Show me more"                                 ← newest message
    //
    // The assistant messages [1], [3] are GPT's previous replies stored in messages[].
    // They are GPT's "memory" — without them GPT would forget the conversation.
    const fullMessages = [systemMessage, ...messages];

    // Streaming mode — sends text word by word (like ChatGPT typing effect)
    // Currently stream=false by default, so this block is usually skipped
    if (stream) {
      const streamObj = await createStreamingChatCompletion(fullMessages, model);
      return new Response(streamObj.toReadableStream(), {
        headers: {
          'Content-Type': 'text/event-stream', // tells browser: keep reading, more text coming
          'Cache-Control': 'no-cache',          // don't cache live streaming data
          'Connection': 'keep-alive',           // keep the connection open while streaming
        },
      });
    }

    // Regular mode — wait for GPT to finish, then return the full reply at once
    // temperature 0.3 = low randomness → consistent, predictable product recommendations
    const response = await createChatCompletion(fullMessages, model, 0.3);

    // Extract just the text string from GPT's response object
    // response.choices[0].message.content = "Here are 3 phones for you..."
    // The ?. (optional chaining) prevents crash if choices is unexpectedly empty
    const assistantReply = response.choices[0]?.message?.content || '';


    // ── STEP 8: DETECT IF GPT WAS CONFUSED ───────────────────────────────────
    // Check if GPT's reply contains phrases that mean it couldn't answer properly.
    // If yes → needsLearning = true → chat gets flagged in admin dashboard.
    // Admin can then write the correct answer via "Teach AI" panel → saves to knowledge collection.
    // Next time a similar question is asked, the knowledge doc will be injected into the system prompt.
    const confusedPhrases = [
      /i('m| am) (not able|unable) to (help|answer|assist)/i,
      /that('s| is) (outside|beyond) (my|our)/i,
      /i don't have (that |any )?information/i,
      /i can'?t (help|answer|assist) (with )?that/i,
      /i'?m not sure (how to|what you|about that)/i,
    ];
    // .some() = true if ANY one pattern matches — stops checking after first match
    const needsLearning = confusedPhrases.some(pattern => pattern.test(assistantReply));


    // ── STEP 9: SAVE CONVERSATION TO FIREBASE ─────────────────────────────────
    // Save the full conversation (including GPT's new reply) under the user's phone number.
    // Using phone number as the ID means all conversations from the same user merge into one doc.
    // merge:true = update existing fields only, never delete old messages.
    const chatId = userData?.phone
      ? `${userData.phone}_${(userData.name || '').replace(/\s+/g, '_')}` // e.g. "33312345_Ahmed_Ali"
      : `anon_${Date.now()}`; // fallback for users who didn't register

    const chatData: Record<string, unknown> = {
      userData: userData || { name: 'Anonymous', phone: 'unknown' },
      messages: [...messages, { role: 'assistant', content: assistantReply }], // full history + new reply
      updatedAt: new Date(),   // used to sort chats by "most recent" in admin dashboard
      needsLearning,           // true = amber flag in admin dashboard
    };

    // If GPT was confused, also save WHAT the user asked so admin knows what to teach
    if (needsLearning) {
      chatData.needsLearningMsg = lastUserMessage; // the unanswered question
      chatData.resolvedAt = null;                  // not resolved yet
    }

    // "Fire and forget" — no await, so we don't make the user wait for Firebase.
    // The reply is returned immediately while Firebase saves in the background.
    db.collection('chats').doc(chatId).set(chatData, { merge: true })
      .catch(err => console.error('Failed to save chat:', err));


    // ── STEP 10: RETURN GPT'S REPLY TO THE FRONTEND ───────────────────────────
    // page.tsx receives { message: "Here are 3 phones..." }
    // It adds it to the screen AND stores it as role:'assistant' in the messages array.
    // The NEXT time the user sends a message, this reply is included in messages[]
    // sent back to this API — giving GPT memory of what it already said.
    return NextResponse.json({
      message: assistantReply, // the actual text to display in the chat bubble
      model: response.model,   // which model was used — "gpt-4o"
      usage: response.usage,   // token count — useful for monitoring API costs
    });

  } catch (error: any) {
    // ── ERROR HANDLER ─────────────────────────────────────────────────────────
    // The try/catch wraps the ENTIRE function.
    // If ANYTHING fails (Firebase down, OpenAI error, null reference, etc.)
    // this catches it and returns a proper error response instead of crashing.
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 } // 500 = internal server error
    );
  }
}