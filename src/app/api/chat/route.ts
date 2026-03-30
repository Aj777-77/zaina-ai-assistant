import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, createStreamingChatCompletion } from '@/lib/openai';
import { getDb } from '@/lib/firebase';
import { criticalRules } from '@/lib/criticalRules';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userData, stream = false, model = 'gpt-4o' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Helper: extract budget info from a single message string
    const extractBudget = (text: string): { min: number | null; max: number | null; isMonthly: boolean } => {
      // Skip messages that are questions about a price, not statements of a budget
      const isInquiry = /\b(how (many|much|long)|for how|will i (pay|be paying)|does it cost|what.?s the (total|price|cost)|tell me (more|about)|how does)\b/i.test(text);
      if (isInquiry) return { min: null, max: null, isMonthly: false };

      const isMonthly = /installm|\/mo|per month|monthly/i.test(text);
      const rangeMatch = text.match(/(?:bd\s*)?([\d,.]+)\s*(?:bd)?\s*(?:to|-)\s*(?:bd\s*)?([\d,.]+)/i);
      if (rangeMatch) {
        return {
          min: parseFloat(rangeMatch[1].replace(/,/g, '')),
          max: parseFloat(rangeMatch[2].replace(/,/g, '')),
          isMonthly
        };
      }
      const upperMatch = text.match(/(?:under|below|less than|budget|max(?:imum)?|up to)\s*(?:bd\s*)?([\d,.]+)/i)
        || text.match(/([\d,.]+)\s*bd/i);
      if (upperMatch) {
        return { min: null, max: parseFloat(upperMatch[1].replace(/,/g, '')), isMonthly };
      }
      return { min: null, max: null, isMonthly };
    };

    // Get all user messages newest-first
    const userMessages = [...messages]
      .reverse()
      .filter((m: { role: string; content: string }) => m.role === 'user')
      .map((m: { role: string; content: string }) => m.content);

    const lastUserMessage = userMessages[0] || '';

    // Try to find a budget — start from latest message and fall back through history
    let budgetMin: number | null = null;
    let budgetMax: number | null = null;
    let isMonthlyQuery = false;

    for (const msg of userMessages) {
      const b = extractBudget(msg);
      if (b.min !== null || b.max !== null) {
        budgetMin = b.min;
        budgetMax = b.max;
        isMonthlyQuery = b.isMonthly;
        break;
      }
      // If message has monthly keyword but no number yet, note it and keep looking
      if (b.isMonthly && !isMonthlyQuery) isMonthlyQuery = true;
    }

    // Helper: extract numeric value and whether it's monthly from a price string
    const parsePriceStr = (priceStr: string): { value: number; isMonthly: boolean } | null => {
      if (!priceStr) return null;
      const str = String(priceStr);
      const isMonthly = /\/mo/i.test(str);
      const match = str.match(/([\d,]+\.?\d*)/);
      if (!match) return null;
      return { value: parseFloat(match[1].replace(/,/g, '')), isMonthly };
    };

    // Full price for budget comparison (monthly × 24 for installment, otherwise face value)
    const getEffectivePrice = (priceStr: string): number | null => {
      const parsed = parsePriceStr(priceStr);
      if (!parsed) return null;
      return parsed.isMonthly ? parsed.value * 24 : parsed.value;
    };

    // Detect requested product category from conversation history
    const categoryKeywordMap: Record<string, string[]> = {
      smartphones: ['smartphone', 'phone', 'mobile', 'iphone', 'samsung', 'pixel', 'galaxy', 'android'],
      tablets: ['tablet', 'ipad', 'tab'],
      laptops: ['laptop', 'notebook', 'macbook', 'computer'],
      smartwatches: ['watch', 'smartwatch', 'galaxy watch', 'apple watch'],
      accessories: ['accessory', 'accessories', 'case', 'charger', 'cable', 'earphone', 'airpod', 'headphone'],
    };

    let requestedCategory: string | null = null;
    outer: for (const msg of userMessages) {
      const lower = msg.toLowerCase();
      for (const [cat, keywords] of Object.entries(categoryKeywordMap)) {
        if (keywords.some(k => lower.includes(k))) {
          requestedCategory = cat;
          break outer;
        }
      }
    }

    // Fetch all products from Firebase
    const productsSnapshot = await db.collection('products').limit(500).get();
    let products = productsSnapshot.docs
      .map(doc => doc.data())
      // Exclude test/placeholder products
      .filter(p => !/\btest\b/i.test(p.name || ''));

    // Pre-filter by category if detected (exclude non-matching categories)
    if (requestedCategory) {
      products = products.filter(p => {
        const cat = ((p.category || '') + ' ' + (p.categoryLabel || '')).toLowerCase();
        const name = (p.name || '').toLowerCase();

        if (requestedCategory === 'smartphones') {
          // Only include products that are actually phones (whitelist approach)
          const isPhone = /smartphone|mobile|phone/i.test(cat)
            || /\biphone\b|\bgalaxy\b|\bpixel\b|\bxiaomi\b|\boppo\b|\brealme\b|\boneplus\b|\bnokia\b|\bhuawei\b|\bhonor\b|\bvivo\b|\bsony\b/i.test(name)
            || /\biphone\b|\bgalaxy\b|\bpixel\b|\bxiaomi\b|\boppo\b|\brealme\b|\boneplus\b|\bnokia\b|\bhuawei\b|\bhonor\b|\bvivo\b|\bsony\b/i.test(cat);
          // But still exclude clear non-phones even if brand matches (e.g. Samsung TV, Xiaomi projector)
          const isDefinitelyNotPhone = /projector|tv\b|television|monitor|speaker|tablet|ipad|laptop|watch|earphone|airpod|headphone|case|cover|charger|cable|screen.?protect|voucher|gift|router|modem|accessory/i.test(name);
          return isPhone && !isDefinitelyNotPhone;
        }
        if (requestedCategory === 'tablets') return /tablet|ipad/i.test(cat);
        if (requestedCategory === 'laptops') return /laptop|notebook/i.test(cat);
        if (requestedCategory === 'smartwatches') return /watch/i.test(cat);
        if (requestedCategory === 'accessories') return /access/i.test(cat);
        return true;
      });
    }

    // Pre-filter by budget
    if (budgetMin !== null || budgetMax !== null) {
      products = products.filter(p => {
        if (isMonthlyQuery) {
          // Resolve the monthly price: prefer p.monthlyPrice, then p.price if it has /mo
          const parsedMonthly = parsePriceStr(p.monthlyPrice);
          const parsedPrice = parsePriceStr(p.price);

          let monthlyValue: number | null = null;
          if (parsedMonthly) {
            monthlyValue = parsedMonthly.value;
          } else if (parsedPrice?.isMonthly) {
            monthlyValue = parsedPrice.value;
          }

          if (monthlyValue === null) return false; // no installment price available
          return (budgetMin === null || monthlyValue >= budgetMin)
              && (budgetMax === null || monthlyValue <= budgetMax);
        } else {
          // User specified full/cash price → compare effective full price
          const parsed = parsePriceStr(p.price);
          if (!parsed) return false;
          const fullPrice = parsed.isMonthly ? parsed.value * 24 : parsed.value;
          return (budgetMin === null || fullPrice >= budgetMin)
              && (budgetMax === null || fullPrice <= budgetMax);
        }
      });
    }

    // If the user is asking for more products, remove already-shown ones from the list
    const isMoreRequest = /\b(more|next|others?|else|another|show more|what else|any other)\b/i.test(lastUserMessage);
    if (isMoreRequest) {
      const assistantMessages = messages
        .filter((m: { role: string; content: string }) => m.role === 'assistant')
        .map((m: { role: string; content: string }) => m.content.toLowerCase());
      const allAssistantText = assistantMessages.join('\n');

      // Remove products whose brand+name already appear in a previous assistant message
      products = products.filter(p => {
        const key = `${p.brand || ''} ${p.name || ''}`.toLowerCase().trim();
        return !allAssistantText.includes(key);
      });
    }

    // Separate trending products (isTrending: true) from the already-filtered list
    const trendingProducts = products.filter(p => p.isTrending === true);

    // Fetch plans from Firebase
    const plansSnapshot = await db.collection('plans').limit(200).get();
    const plans = plansSnapshot.docs.map(doc => doc.data());

    // Fetch dynamic persona from Firebase (persona only — NOT rules)
    const configDoc = await db.collection('config').doc('systemPrompt').get();
    const personaPrompt = (configDoc.exists && configDoc.data()?.content)
      ? configDoc.data()?.content
      : `You are Zaina, a friendly and helpful AI shopping assistant for Zain Bahrain's e-commerce store.

Your role:
- Help customers find phones, tablets, laptops, smartwatches, accessories, vouchers, gift cards, home solutions, gaming products, and plans from Zain Bahrain
- Provide product recommendations based on their needs and budget
- Answer questions about devices, specifications, and plans
- Be conversational, friendly, and enthusiastic about technology
- Always mention prices in Bahraini Dinars (BD)

Product categories available:
- Smartphones
- iPads, Tablets & Laptops
- Smartwatches
- Accessories
- Vouchers
- Gift Cards
- Home Solution & Gaming`;

    // These rules are ALWAYS enforced — never overridden by Firebase (imported from src/lib/criticalRules.ts)

    const baseSystemPrompt = personaPrompt + criticalRules;

    // Fetch learning hub/knowledge documents — only include docs relevant to the current query
    const knowledgeSnapshot = await db.collection('knowledge').limit(20).get();
    let knowledgeContext = '';
    if (!knowledgeSnapshot.empty) {
      const queryWords = userMessages.slice(0, 3).join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3);

      const relevantDocs = knowledgeSnapshot.docs
        .map(doc => doc.data())
        .filter(data => {
          if (!data.content && !data.title) return false;
          const docText = `${data.title} ${data.content}`.toLowerCase();
          // Include doc if it shares any meaningful keyword with recent user messages
          return queryWords.some(w => docText.includes(w));
        });

      if (relevantDocs.length > 0) {
        const MAX_DOC_CHARS = 1500; // cap each doc to avoid token blowout
        knowledgeContext = '\n\n=== REFERENCE KNOWLEDGE BASE ===\n' +
          relevantDocs.map(data => {
            const content: string = data.content || '';
            const truncated = content.length > MAX_DOC_CHARS;
            const body = truncated ? content.slice(0, MAX_DOC_CHARS) : content;
            const note = truncated
              ? '\n[Document truncated — summarize the key points from the above in your own words, keeping your answer concise and clear for the customer.]'
              : '';
            return `Title: ${data.title}\nContent:\n${body}${note}`;
          }).join('\n\n') +
          '\n=== END OF REFERENCE KNOWLEDGE BASE ===';
      }
    }

    // Build trending products context
    let trendingContext = '';
    if (trendingProducts.length > 0) {
      trendingContext = '\n\n=== TRENDING NOW (check this first) ===\n' +
        trendingProducts.map(p =>
          `  • ${p.brand} ${p.name} | Price: ${p.price}${p.monthlyPrice && p.monthlyPrice !== p.price ? ` | Monthly: ${p.monthlyPrice}` : ''}${p.savings ? ` | Offer: ${p.savings}` : ''} | Category: ${p.categoryLabel || p.category}${(budgetMin !== null || budgetMax !== null) ? ' [CONFIRMED WITHIN CUSTOMER BUDGET]' : ''}`
        ).join('\n') +
        '\n=== END OF TRENDING NOW ===';
    } else {
      trendingContext = '\n\n=== TRENDING NOW ===\n[NO TRENDING PRODUCTS MATCH THE CURRENT FILTER]\n=== END OF TRENDING NOW ===';
    }

    // Build product context grouped by category
    let productContext = '';
    if (products.length > 0) {
      // Remove duplicates based on category + brand + name
      const uniqueProducts = Array.from(
        new Map(products.map(p => [`${p.category}-${p.brand}-${p.name}`, p])).values()
      );

      // Group by category
      const grouped: Record<string, typeof uniqueProducts> = {};
      uniqueProducts.forEach(p => {
        const key = p.categoryLabel || p.category || 'Other';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });

      const budgetTag = (budgetMin !== null || budgetMax !== null) ? ' [CONFIRMED WITHIN CUSTOMER BUDGET]' : '';
      productContext = '\n\n=== AVAILABLE PRODUCTS IN INVENTORY ===\n' +
        Object.entries(grouped).map(([catLabel, catProducts]) =>
          `[${catLabel}]\n` + catProducts.map(p =>
            `  • ${p.brand} ${p.name} | Price: ${p.price}${p.monthlyPrice && p.monthlyPrice !== p.price ? ` | Monthly: ${p.monthlyPrice}` : ''}${p.savings ? ` | Offer: ${p.savings}` : ''}${budgetTag}`
          ).join('\n')
        ).join('\n\n') +
        '\n=== END OF INVENTORY ===';
    } else {
      productContext = '\n\n=== AVAILABLE PRODUCTS IN INVENTORY ===\n[NO PRODUCTS MATCH THE CURRENT FILTER — DO NOT INVENT ANY PRODUCTS. Tell the customer we currently have nothing available matching their request.]\n=== END OF INVENTORY ===';
    }

    // Build plans context
    let plansContext = '';
    if (plans.length > 0) {
      const groupedPlans: Record<string, typeof plans> = {};
      plans.forEach(p => {
        const key = `${p.category} / ${p.subCategory}`;
        if (!groupedPlans[key]) groupedPlans[key] = [];
        groupedPlans[key].push(p);
      });

      // Detect unlimited plans server-side so AI cannot hallucinate their absence
      const unlimitedPlans = plans.filter(p => /unlimited/i.test(p.data || ''));
      const unlimitedNote = unlimitedPlans.length > 0
        ? `\n⚠️ UNLIMITED DATA PLANS EXIST: The following plans have Unlimited data — ${unlimitedPlans.map(p => p.name).join(', ')}. When a customer asks for unlimited data, ALWAYS recommend from this list first.`
        : `\nNOTE: No plans currently have "Unlimited" in their Data field. Do not claim any plan has unlimited data.`;

      plansContext = '\n\n=== AVAILABLE PLANS ===' + unlimitedNote + '\n' + Object.entries(groupedPlans).map(([group, groupPlans]) =>
        `[${group}]\n` + groupPlans.map(p =>
          `  • ${p.name} – ${p.price}/month${p.data ? ` | Data: ${p.data}` : ''}${p.banner ? ` | Offer: ${p.banner}` : ''}${p.features?.length ? `\n    Features: ${p.features.join(', ')}` : ''}`
        ).join('\n')
      ).join('\n\n') + '\n=== END OF PLANS ===';
    }

    // Add budget note if filtering was applied
    let budgetNote = '';
    if (budgetMin !== null || budgetMax !== null) {
      if (isMonthlyQuery) {
        const range = budgetMin !== null && budgetMax !== null
          ? `BD ${budgetMin} to BD ${budgetMax} per month`
          : budgetMax !== null ? `up to BD ${budgetMax} per month` : `from BD ${budgetMin} per month`;
        budgetNote = `\n\nNOTE: The customer's budget is a MONTHLY INSTALLMENT range of ${range}. The product lists below have already been pre-filtered to only include items whose monthly installment price is within this range. When evaluating budget fit, ALWAYS compare the "Monthly" price — NEVER the full cash price — against the customer's monthly budget. A product is within budget if its monthly installment is within the range, regardless of its full price.`;
      } else {
        const range = budgetMin !== null && budgetMax !== null
          ? `BD ${budgetMin} to BD ${budgetMax}`
          : budgetMax !== null ? `up to BD ${budgetMax}` : `from BD ${budgetMin}`;
        budgetNote = `\n\nNOTE: The product lists below have already been pre-filtered to only include items whose full price (monthly × 24 for installment items) is ${range}. Do NOT suggest anything outside this list.`;
      }
    }

    // Add "more" instruction when the user is requesting additional products
    // Also always tell the LLM how many products are in the current filtered list
    const remainingCount = products.length;
    const moreNote = isMoreRequest && remainingCount > 0
      ? `\n\nIMPORTANT — "MORE PRODUCTS" REQUEST: The customer is asking for more options. The inventory below has been updated to show ONLY products not yet shown in this conversation. You MUST present up to 3 from the list. There are ${remainingCount} product(s) remaining. After showing them, if more still remain, ask if they'd like to see more.`
      : remainingCount > 0
      ? `\n\nINVENTORY COUNT: There are ${remainingCount} product(s) in the filtered inventory below. Show up to 3. If more remain after your response, proactively tell the customer how many are left and ask if they want to see them.`
      : '';

    // Combine all contexts into the system message
    const followUpReminder = `\n\n⚠️ MANDATORY FINAL INSTRUCTION — THIS OVERRIDES EVERYTHING: You MUST end EVERY response with a follow-up question. No exceptions. Not even for short answers. The question must be relevant to what was just discussed and guide the customer to their next step. If you answer a policy question, ask if they want to know about plans. If you recommend products, ask if they want to compare or see more. NEVER end a response without a question.`;

    const systemMessage = {
      role: 'system' as const,
      content: `${baseSystemPrompt}${budgetNote}${moreNote}${knowledgeContext}${trendingContext}${productContext}${plansContext}${followUpReminder}`
    };

    // If a budget/installment filter was active but returned zero products, skip the LLM entirely
    // to prevent hallucination of non-existent products.
    const filterWasActive = budgetMin !== null || budgetMax !== null;
    if (filterWasActive && products.length === 0) {
      let noResultMsg: string;
      if (isMoreRequest) {
        noResultMsg = `That's everything we have in that range — I've shown you all the available options. Would you like to explore a different price range or category?`;
      } else if (isMonthlyQuery && budgetMin !== null && budgetMax !== null) {
        noResultMsg = `I'm sorry, we don't currently have any smartphones available with a monthly installment between BD ${budgetMin} and BD ${budgetMax}. Would you like me to check a different price range or show you what's available nearby?`;
      } else if (isMonthlyQuery && budgetMax !== null) {
        noResultMsg = `I'm sorry, we don't currently have any products with a monthly installment up to BD ${budgetMax}. Would you like to try a higher range?`;
      } else if (budgetMax !== null) {
        noResultMsg = `I'm sorry, we don't currently have any products under BD ${budgetMax}. Would you like to explore a higher budget or a different category?`;
      } else {
        noResultMsg = `I'm sorry, I couldn't find any products matching your request right now. Can I help you with something else?`;
      }

      {
        const chatId = (userData?.name && userData?.phone)
          ? `${userData.phone}_${userData.name.replace(/\s+/g, '_')}`
          : `anon_${Date.now()}`;
        db.collection('chats').doc(chatId).set({
          userData: userData || { name: 'Anonymous', phone: 'unknown' },
          messages: [...messages, { role: 'assistant', content: noResultMsg }],
          updatedAt: new Date(),
          needsLearning: false,
        }, { merge: true }).catch(err => console.error('Failed to save chat', err));
      }

      return NextResponse.json({ message: noResultMsg });
    }

    const fullMessages = [systemMessage, ...messages];

    // Handle streaming response (simplified, stream is normally passed back, but we also want to save the chat)
    // Note: If saving standard streaming chat, it requires wrapping the stream to capture the output.
    // Given the constraints, we will log the chat without the assistant's final response if it's streamed,
    // or we'll rely on the client to send the full history next time.

    if (stream) {
      const streamObj = await createStreamingChatCompletion(fullMessages, model);
      return new Response(streamObj.toReadableStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Handle regular response
    const response = await createChatCompletion(fullMessages, model, 0.3);
    const assistantReply = response.choices[0]?.message?.content || '';

    // Detect if AI couldn't answer or got a weird/out-of-scope question
    const needsLearningPatterns = [
      /i'm here to help you find the right product or plan from zain bahrain/i,
      /i('m| am) (not able|unable) to (help|answer|assist)/i,
      /that('s| is) (outside|beyond) (my|our)/i,
      /i don't have (that |any )?information/i,
      /i can'?t (help|answer|assist) (with )?that/i,
      /i'?m not sure (how to|what you|about that)/i,
    ];
    const needsLearning = needsLearningPatterns.some(p => p.test(assistantReply));

    // Save chat including the AI's response — always save, even for anonymous users
    const chatId = (userData?.name && userData?.phone)
      ? `${userData.phone}_${userData.name.replace(/\s+/g, '_')}`
      : `anon_${Date.now()}`;

    const fullConversation = [
      ...messages,
      { role: 'assistant', content: assistantReply }
    ];

    const chatData: Record<string, unknown> = {
      userData: userData || { name: 'Anonymous', phone: 'unknown' },
      messages: fullConversation,
      updatedAt: new Date(),
      needsLearning,
    };
    if (needsLearning) {
      chatData.needsLearningMsg = lastUserMessage;
      chatData.resolvedAt = null;
    }

    db.collection('chats').doc(chatId).set(chatData, { merge: true })
      .catch(err => console.error('Failed to save chat', err));

    return NextResponse.json({
      message: assistantReply,
      model: response.model,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
