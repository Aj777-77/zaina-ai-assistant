import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import OpenAI from 'openai';
const openai = new OpenAI();
async function test() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You are an expert commerce search assistant.
=== AVAILABLE PLANS ===
NOTE: No plans have Unlimited data. Do not claim otherwise.

[mobile / postpaid_contract]
  • Wiyana Max – BD 19.100/month | Data: 110GB
=== END OF PLANS ===

CRITICAL ANTI-HALLUCINATION RULE: You must ONLY recommend products, prices, and plans that are explicitly listed above in the INVENTORY. NEVER invent, guess, or pull products from your general pre-trained knowledge.`
      },
      {
        role: 'user',
        content: "I am a heavy gamer, I need a mobile plan with truly unlimited 5G data. What are my options?"
      }
    ]
  });
  console.log(response.choices[0].message.content);
}
test();
