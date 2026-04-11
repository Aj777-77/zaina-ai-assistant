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
NOTE: Customer's monthly budget is up to BD 30/month. Products are pre-filtered by monthly price. Plans are NOT pre-filtered. If the customer wants a phone AND a plan, you must do the math to ensure (Phone Monthly + Plan Monthly) does not exceed their total budget. Scan the ENTIRE plans list for cheaper options.

=== AVAILABLE PRODUCTS IN INVENTORY ===
[smartphones]
  • Apple iPhone 17 | Price: BD 280.000 | Monthly: BD 12.900 /mo [CONFIRMED WITHIN CUSTOMER BUDGET]
=== END OF INVENTORY ===

=== AVAILABLE PLANS ===
[mobile / postpaid_contract]
  • Wiyana + – BD 12.500/month | Data: 40GB
  • Wiyana Advanced – BD 14.700/month | Data: 60GB
  • Wiyana International – BD 10.300/month | Data: 30GB
  • Wiyana Max – BD 19.100/month | Data: 110GB
=== END OF PLANS ===`
      },
      {
        role: 'user',
        content: "I want an iPhone 17 and a postpaid plan, and my maximum budget for both together is BD 30 per month."
      }
    ]
  });
  console.log(response.choices[0].message.content);
}
test();
