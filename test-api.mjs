import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'I need a laptop with a maximum budget of BD 600.' }]
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test().catch(console.error);
