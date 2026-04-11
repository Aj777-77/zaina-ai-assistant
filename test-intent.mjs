import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import OpenAI from 'openai';
const openai = new OpenAI();
async function test() {
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
2. If the user states a specific new flagship/expensive product name in their final message (like "iPhone 17") without re-stating a budget, set the "budget" to null so it doesn't get hidden. 
3. If they say "cheaper", figure out the previously understood max budget, and return a significantly lower max. 
4. Handle conversational misunderstandings correctly. If they say "how much in case", that means "how much in cash" (prices). DO NOT trigger the "accessories" category just because of the word "case".
5. If the user asks for screens, monitors, or displays (even for gaming), map the category to "tvs".
OUTPUT STRICT JSON ONLY.`
      },
      {
        role: 'user',
        content: "[Msg 1]: I need a laptop with a maximum budget of BD 600."
      }
    ]
  });
  console.log(response.choices[0].message.content);
}
test();
