import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as readline from 'readline';
import { scrapeAllPlans, PLAN_CATEGORIES } from '../src/scraper/plan-scraper';
import { getDb } from '../src/lib/firebase';

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function clearCollection(collectionPath: string) {
  const db = getDb();
  const ref = db.collection(collectionPath);
  const batchSize = 100;
  let deleted = 0;
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.docs.length;
  }
  return deleted;
}

async function fetchAndSavePlans() {
  console.log('🤖 Zaina AI – Fetch and Save Plans to Firestore\n');
  console.log(`📋 Will scrape ${PLAN_CATEGORIES.length} plan categories:\n`);
  PLAN_CATEGORIES.forEach(c => console.log(`   • [${c.category}] ${c.label}`));
  console.log();

  const plans = await scrapeAllPlans();

  if (plans.length === 0) {
    console.log('\n⚠️  No plans found across all categories. Check selectors or page load.');
    process.exit(0);
  }

  // Show summary before asking
  const grouped: Record<string, number> = {};
  plans.forEach(p => {
    const key = `${p.category} / ${p.subCategory}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  console.log(`\n📊 Scrape complete. Summary by category:`);
  Object.entries(grouped).forEach(([k, v]) => console.log(`   ${k}: ${v} plans`));
  console.log(`\n   Total: ${plans.length} plans`);

  const ok = await confirm(
    '\n⚠️  This will DELETE all existing plans in Firestore and replace them with the scraped data.\nConfirm? (y/N): '
  );

  if (!ok) {
    console.log('\n❌ Cancelled. No data was saved.');
    process.exit(0);
  }

  const db = getDb();
  const plansRef = db.collection('plans');

  console.log('\n🗑️  Clearing existing plans collection...');
  const deleted = await clearCollection('plans');
  console.log(`   Deleted ${deleted} existing documents.`);

  console.log('\n💾 Saving scraped plans to Firestore...');
  let savedCount = 0;
  let errorCount = 0;

  for (const plan of plans) {
    try {
      const safeName = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const docId = `${plan.category}-${plan.subCategory}-${safeName}`;
      await plansRef.doc(docId).set({ ...plan, updatedAt: new Date() });
      savedCount++;
      console.log(`  ✅ Saved: [${plan.subCategory}] ${plan.name} – ${plan.price}`);
    } catch (err) {
      errorCount++;
      console.error(`  ❌ Failed to save "${plan.name}":`, err);
    }
  }

  console.log(`\n🎉 Done! Saved ${savedCount} plans to Firestore.`);
  if (errorCount > 0) console.log(`⚠️  ${errorCount} plans failed to save.`);

  process.exit(0);
}

fetchAndSavePlans();
