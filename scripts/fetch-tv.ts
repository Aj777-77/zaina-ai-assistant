import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ZainBahrainScraper } from '../src/scraper/zain-scraper';
import { getDb } from '../src/lib/firebase';

async function run() {
  const scraper = new ZainBahrainScraper();
  const db = getDb();
  const productsRef = db.collection('products');

  try {
    await scraper.initialize(true);
    console.log('🔍 Scraping TV category...');
    const products = await scraper.scrapeByCategory('https://eshop.bh.zain.com/product/tv');
    console.log(`✅ Found ${products.length} products`);

    let saved = 0;
    for (const product of products) {
      const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const safeBrand = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const docId = `tv-${safeBrand}-${safeName}`;
      await productsRef.doc(docId).set(
        { ...product, category: 'tv', categoryLabel: 'TV', updatedAt: new Date(), createdAt: new Date() },
        { merge: true }
      );
      saved++;
      console.log(`  💾 ${product.brand} ${product.name} | ${product.price}${product.monthlyPrice ? ' | ' + product.monthlyPrice : ''}`);
    }
    console.log(`\n🎉 Saved ${saved} TV products to Firestore`);
  } finally {
    await scraper.close();
    process.exit(0);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
