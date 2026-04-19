import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as readline from 'readline';
import { ZainBahrainScraper, PRODUCT_CATEGORIES, ZainProduct } from '../src/scraper/zain-scraper';
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

async function fetchAndSaveProducts() {
  console.log('🤖 Zaina AI – Fetch and Save All Products to Firestore\n');
  console.log(`📦 Will scrape ${PRODUCT_CATEGORIES.length} product categories:\n`);
  PRODUCT_CATEGORIES.forEach(c => console.log(`   • [${c.category}] ${c.label}`));
  console.log();

  const scraper = new ZainBahrainScraper();
  const allProducts: (ZainProduct & { category: string; categoryLabel: string })[] = [];
  const summary: Record<string, number> = {};

  try {
    await scraper.initialize(true);

    for (const cat of PRODUCT_CATEGORIES) {
      console.log(`\n📂 Scraping [${cat.label}] from ${cat.url}...`);
      try {
        const products = await scraper.scrapeByCategory(cat.url);
        products.forEach(p => allProducts.push({ ...p, category: cat.category, categoryLabel: cat.label }));
        summary[cat.label] = products.length;
        console.log(`  ✅ Found ${products.length} products.`);
      } catch (err) {
        console.error(`  ❌ Failed to scrape ${cat.label}:`, err);
        summary[cat.label] = 0;
      }
    }

  } finally {
    await scraper.close();
  }

  // Show summary before asking
  console.log(`\n📊 Scrape complete. Summary by category:`);
  Object.entries(summary).forEach(([label, count]) =>
    console.log(`   ${label}: ${count} products`)
  );
  console.log(`\n   Total: ${allProducts.length} products`);

  if (allProducts.length === 0) {
    console.log('\n⚠️  No products found. Nothing to save.');
    process.exit(0);
  }

  const ok = await confirm(
    '\n⚠️  This will DELETE all existing products in Firestore and replace them with the scraped data.\nConfirm? (y/N): '
  );

  if (!ok) {
    console.log('\n❌ Cancelled. No data was saved.');
    process.exit(0);
  }

  const db = getDb();
  const productsRef = db.collection('products');

  console.log('\n🗑️  Clearing existing products collection...');
  const deleted = await clearCollection('products');
  console.log(`   Deleted ${deleted} existing documents.`);

  console.log('\n💾 Saving scraped products to Firestore...');
  let totalSaved = 0;
  let totalErrors = 0;

  for (const product of allProducts) {
    try {
      const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const safeBrand = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const docId = `${product.category}-${safeBrand}-${safeName}`;

      await productsRef.doc(docId).set({
        ...product,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      totalSaved++;
    } catch (err) {
      totalErrors++;
      console.error(`  ❌ Failed to save "${product.name}":`, err);
    }
  }

  console.log(`\n🎉 Done! Saved ${totalSaved} products.`);
  if (totalErrors > 0) console.log(`⚠️  ${totalErrors} products failed to save.`);

  process.exit(0);
}

fetchAndSaveProducts();
