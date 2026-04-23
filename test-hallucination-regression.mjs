// Regression tests after removing the hallucination validator.
// Runs a set of prompts against the local /api/chat endpoint and checks the
// reply for any product names that do NOT exist in Firestore.
//
// Usage:
//   1. Start the dev server:  npm run dev
//   2. Run:                    node test-hallucination-regression.mjs
//
// Exits 0 if all tests pass, 1 otherwise.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const API_URL = process.env.CHAT_API_URL || 'http://localhost:3000/api/chat';

// ── Firestore setup ──────────────────────────────────────────────────────────
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── Load authoritative inventory ─────────────────────────────────────────────
const productsSnap = await db.collection('products').get();
const plansSnap = await db.collection('plans').get();
const products = productsSnap.docs.map(d => d.data());
const plans = plansSnap.docs.map(d => d.data());

const productNameSet = new Set(
  products.map(p => `${p.brand || ''} ${p.name || ''}`.toLowerCase().replace(/\s+/g, ''))
);
const planNameSet = new Set(
  plans.map(p => (p.name || '').toLowerCase().replace(/\s+/g, ''))
);

console.log(`Loaded ${products.length} products and ${plans.length} plans from Firestore.\n`);

// ── Hallucination patterns we care about ─────────────────────────────────────
// These match common older/invented models GPT tends to pull from pre-training.
const hallucinationPatterns = [
  /\b(?:samsung\s+)?galaxy\s+s(?:1\d|2[0-4])(?:\s+(?:ultra|plus|fe|edge|5g))?\b/gi,
  /\b(?:samsung\s+)?galaxy\s+z?\s*fold\s?[1-6]\b/gi,
  /\b(?:samsung\s+)?galaxy\s+z?\s*flip\s?[1-6]\b/gi,
  /\b(?:apple\s+)?iphone\s+(?:[4-9]|1[0-6]|x(?:s|r)?|se)(?:\s+(?:pro|plus|max|mini))*\b/gi,
  /\b(?:google\s+)?pixel\s+[1-9]\b/gi,
];

function findHallucinatedNames(reply) {
  if (!reply) return [];
  const found = [];
  for (const pattern of hallucinationPatterns) {
    const matches = reply.match(pattern) || [];
    for (const m of matches) {
      const normalized = m.toLowerCase().replace(/\s+/g, '');
      // Only flag if it's NOT in the real inventory.
      const inInventory = [...productNameSet].some(n => n.includes(normalized));
      if (!inInventory) found.push(m.trim());
    }
  }
  return Array.from(new Set(found));
}

// ── Chat helper ──────────────────────────────────────────────────────────────
async function chat(messages) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      userData: { name: 'Test User', phone: '00000000' },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message || '';
}

// ── Test cases ───────────────────────────────────────────────────────────────
const tests = [
  {
    name: 'Hallucination: "phone for gaming" — no S23/Fold5/Flip5/iPhone 16',
    messages: [{ role: 'user', content: 'I need a phone for gaming' }],
    assert: (reply) => {
      const halluc = findHallucinatedNames(reply);
      const refusedWrongly = /don'?t have any.*gaming|no.*gaming phones/i.test(reply);
      if (halluc.length) return `Hallucinated: ${halluc.join(', ')}`;
      if (refusedWrongly) return `Refused wrongly: "${reply.slice(0, 120)}..."`;
      return null;
    },
  },
  {
    name: 'Hallucination: "I prefer iPhone" after gaming ask',
    messages: [
      { role: 'user', content: 'I need a phone for gaming' },
      { role: 'assistant', content: '(prior reply)' },
      { role: 'user', content: 'but I prefer iPhone' },
    ],
    assert: (reply) => {
      const halluc = findHallucinatedNames(reply);
      return halluc.length ? `Hallucinated: ${halluc.join(', ')}` : null;
    },
  },
  {
    name: 'Budget: "BD 30 budget for iPhone" treated as monthly',
    messages: [{ role: 'user', content: 'I have a budget of BD 30, recommend an iPhone' }],
    assert: (reply) => {
      if (/no.*iphone|don'?t have.*iphone.*30/i.test(reply)) {
        return 'Refused — likely interpreted BD 30 as cash instead of monthly';
      }
      const halluc = findHallucinatedNames(reply);
      return halluc.length ? `Hallucinated: ${halluc.join(', ')}` : null;
    },
  },
  {
    name: 'Budget: "BD 30 budget for iPad" treated as monthly',
    messages: [{ role: 'user', content: 'my budget is BD 30 and I want an iPad' }],
    assert: (reply) => {
      if (/no.*ipad|don'?t have.*ipad.*30/i.test(reply)) {
        return 'Refused — likely interpreted BD 30 as cash instead of monthly';
      }
      return null;
    },
  },
  {
    name: 'Use case: "phone for photography" recommends real phones',
    messages: [{ role: 'user', content: 'I want a phone for photography' }],
    assert: (reply) => {
      const halluc = findHallucinatedNames(reply);
      const refusedWrongly = /don'?t have.*photography|no.*photography phones/i.test(reply);
      if (halluc.length) return `Hallucinated: ${halluc.join(', ')}`;
      if (refusedWrongly) return `Refused wrongly: "${reply.slice(0, 120)}..."`;
      return null;
    },
  },
  {
    name: 'Unlimited data: user asks for unlimited 5G home',
    messages: [{ role: 'user', content: 'I want an unlimited 5G home internet plan' }],
    assert: (reply) => {
      // If there IS an unlimited plan, the reply should mention one.
      const unlimitedPlans = plans.filter(p => /unlimited/i.test(p.data || ''));
      if (unlimitedPlans.length === 0) return null; // nothing to test
      const mentionsUnlimited = /unlimited/i.test(reply);
      if (!mentionsUnlimited) return `Reply did not mention unlimited despite ${unlimitedPlans.length} unlimited plan(s) in Firestore`;
      // Falsely calling a non-unlimited plan "unlimited" = bug
      const falseUnlimitedClaim = plans.some(p => {
        if (/unlimited/i.test(p.data || '')) return false;
        return new RegExp(`${p.name}.*unlimited`, 'i').test(reply);
      });
      if (falseUnlimitedClaim) return `Called a non-unlimited plan "unlimited"`;
      return null;
    },
  },
  {
    name: 'Empty-category guard: asking for something we don\'t stock',
    messages: [{ role: 'user', content: 'do you sell drones?' }],
    assert: (reply) => {
      const halluc = findHallucinatedNames(reply);
      return halluc.length ? `Hallucinated: ${halluc.join(', ')}` : null;
    },
  },
  {
    name: 'Brand filter: "like Samsung but cheaper" avoids Samsung',
    messages: [{ role: 'user', content: 'I want a phone like Samsung but cheaper' }],
    assert: (reply) => {
      // Rule says recommend a third-party brand, not Samsung itself.
      // This is a soft check — just flag if ONLY Samsung phones are recommended.
      const mentionsSamsung = /samsung|galaxy/i.test(reply);
      const mentionsOther = /iphone|pixel|xiaomi|oppo|realme|oneplus|honor|huawei|vivo|sony/i.test(reply);
      if (mentionsSamsung && !mentionsOther) {
        return 'Recommended only Samsung despite "cheaper than Samsung" request';
      }
      return null;
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

for (const test of tests) {
  process.stdout.write(`⏳ ${test.name} ... `);
  try {
    const reply = await chat(test.messages);
    const failure = test.assert(reply);
    if (failure) {
      console.log(`❌ FAIL`);
      failures.push({ name: test.name, failure, reply });
      failed++;
    } else {
      console.log(`✅ PASS`);
      passed++;
    }
  } catch (err) {
    console.log(`💥 ERROR`);
    failures.push({ name: test.name, failure: String(err), reply: '' });
    failed++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed (of ${tests.length})`);
console.log('='.repeat(60));

if (failures.length) {
  console.log('\nFailure details:\n');
  for (const f of failures) {
    console.log(`• ${f.name}`);
    console.log(`  → ${f.failure}`);
    if (f.reply) console.log(`  reply: ${f.reply.slice(0, 300).replace(/\n/g, ' ')}${f.reply.length > 300 ? '...' : ''}`);
    console.log();
  }
}

process.exit(failed > 0 ? 1 : 0);
