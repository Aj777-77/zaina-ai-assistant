import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapeAllPlans, PLAN_CATEGORIES } from '../src/scraper/plan-scraper';
import { getDb } from '../src/lib/firebase';

async function fetchAndSavePlans() {
  console.log('🤖 Zaina AI – Fetch and Save Plans to Firestore\n');
  console.log(`📋 Will scrape ${PLAN_CATEGORIES.length} plan categories:\n`);
  PLAN_CATEGORIES.forEach(c => console.log(`   • [${c.category}] ${c.label}`));
  console.log();

  const db = getDb();
  const plansRef = db.collection('plans');

  try {
    const plans = await scrapeAllPlans();

    if (plans.length === 0) {
      console.log('\n⚠️  No plans found across all categories. Check selectors or page load.');
      return;
    }

    console.log(`\n✅ Total plans scraped: ${plans.length}`);
    console.log('💾 Saving to Firestore...\n');

    let savedCount = 0;
    let errorCount = 0;

    for (const plan of plans) {
      try {
        // Build a stable document ID
        const safeName = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const docId = `${plan.category}-${plan.subCategory}-${safeName}`;

        await plansRef.doc(docId).set(
          {
            ...plan,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        savedCount++;
        console.log(`  ✅ Saved: [${plan.subCategory}] ${plan.name} – ${plan.price}`);
      } catch (err) {
        errorCount++;
        console.error(`  ❌ Failed to save "${plan.name}":`, err);
      }
    }

    console.log(`\n🎉 Done! Saved ${savedCount} plans to Firestore.`);
    if (errorCount > 0) console.log(`⚠️  ${errorCount} plans failed to save.`);

    // Print summary by category
    console.log('\n📊 Summary by category:');
    const grouped: Record<string, number> = {};
    plans.forEach(p => {
      const key = `${p.category} / ${p.subCategory}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    Object.entries(grouped).forEach(([k, v]) => console.log(`   ${k}: ${v} plans`));

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

fetchAndSavePlans();
