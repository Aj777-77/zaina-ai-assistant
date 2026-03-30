import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ZainBahrainScraper, PRODUCT_CATEGORIES } from '../src/scraper/zain-scraper';
import { getDb } from '../src/lib/firebase';

async function fetchAndSaveProducts() {
  console.log('🤖 Zaina AI – Fetch and Save All Products to Firestore\n');
  console.log(`📦 Will scrape ${PRODUCT_CATEGORIES.length} product categories:\n`);
  PRODUCT_CATEGORIES.forEach(c => console.log(`   • [${c.category}] ${c.label}`));
  console.log();

  const scraper = new ZainBahrainScraper();
  const db = getDb();
  const productsRef = db.collection('products');

  let totalSaved = 0;
  let totalErrors = 0;
  const summary: Record<string, number> = {};

  try {
    await scraper.initialize(true);

    for (const cat of PRODUCT_CATEGORIES) {
      console.log(`\n📂 Scraping [${cat.label}] from ${cat.url}...`);

      try {
        const products = await scraper.scrapeByCategory(cat.url);

        if (products.length === 0) {
          console.log(`  ⚠️  No products found for ${cat.label}.`);
          summary[cat.label] = 0;
          continue;
        }

        console.log(`  ✅ Found ${products.length} products. Saving to Firestore...`);
        let catSaved = 0;

        for (const product of products) {
          try {
            const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const safeBrand = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const docId = `${cat.category}-${safeBrand}-${safeName}`;

            await productsRef.doc(docId).set(
              {
                ...product,
                category: cat.category,
                categoryLabel: cat.label,
                updatedAt: new Date(),
                createdAt: new Date(),
              },
              { merge: true }
            );
            catSaved++;
            totalSaved++;
          } catch (err) {
            totalErrors++;
            console.error(`    ❌ Failed to save "${product.name}":`, err);
          }
        }

        console.log(`  💾 Saved ${catSaved} products for [${cat.label}]`);
        summary[cat.label] = catSaved;

      } catch (err) {
        console.error(`  ❌ Failed to scrape ${cat.label}:`, err);
        summary[cat.label] = 0;
      }
    }

    console.log(`\n🎉 Done! Total saved: ${totalSaved} products.`);
    if (totalErrors > 0) console.log(`⚠️  ${totalErrors} products failed to save.`);

    console.log('\n📊 Summary by category:');
    Object.entries(summary).forEach(([label, count]) =>
      console.log(`   ${label}: ${count} products`)
    );

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await scraper.close();
    process.exit(0);
  }
}

fetchAndSaveProducts();
