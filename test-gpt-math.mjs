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
NOTE: Customer's cash budget is up to BD 600. Products are pre-filtered. Do NOT suggest anything outside this list.

=== AVAILABLE PRODUCTS IN INVENTORY ===
[laptops]
  • Lenovo Idea Pad 1 | Price: BD 124.630 | Monthly: BD 20.200 /mo [CONFIRMED WITHIN CUSTOMER BUDGET]
=== END OF INVENTORY ===`
      },
      {
        role: 'user',
        content: "I need a laptop with a maximum budget of BD 600."
      }
    ]
  });
  console.log(response.choices[0].message.content);
}
test();
