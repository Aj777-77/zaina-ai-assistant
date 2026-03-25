import { NextRequest, NextResponse } from 'next/server';
import { scrapeZainBahrain, ZainBahrainScraper } from '@/scraper/zain-scraper';
import { getDb } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { saveToDb = true, category = null } = body;

    console.log('🔍 Starting Zain Bahrain scrape...');

    // Scrape products
    let products;
    if (category) {
      const scraper = new ZainBahrainScraper();
      await scraper.initialize(true);
      products = await scraper.scrapeByCategory(category);
      await scraper.close();
    } else {
      products = await scrapeZainBahrain();
    }

    console.log(`✅ Scraped ${products.length} products`);

    // Save to Firestore if requested
    let savedProducts = [];
    if (saveToDb && products.length > 0) {
      const db = getDb();
      const productsRef = db.collection('products');

      // Save each product
      savedProducts = await Promise.all(
        products.map(async (product) => {
          // Check if product already exists (by name and brand)
          const existingQuery = await productsRef
            .where('name', '==', product.name)
            .where('brand', '==', product.brand)
            .limit(1)
            .get();

          if (!existingQuery.empty) {
            // Update existing product
            const docId = existingQuery.docs[0].id;
            await productsRef.doc(docId).update({
              ...product,
              updatedAt: new Date()
            });
            return { id: docId, ...product, updated: true };
          } else {
            // Add new product
            const docRef = await productsRef.add({
              ...product,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            return { id: docRef.id, ...product, updated: false };
          }
        })
      );

      console.log(`✅ Saved ${savedProducts.length} products to Firestore`);
    }

    return NextResponse.json({
      message: 'Scrape completed successfully',
      count: products.length,
      products: saveToDb ? savedProducts : products,
      savedToDb: saveToDb
    });

  } catch (error: any) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape products' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Quick scrape without saving to DB
    console.log('🔍 Quick scrape request...');

    const products = await scrapeZainBahrain();

    return NextResponse.json({
      message: 'Scrape completed',
      count: products.length,
      products,
      savedToDb: false
    });

  } catch (error: any) {
    console.error('Scrape GET API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape products' },
      { status: 500 }
    );
  }
}
