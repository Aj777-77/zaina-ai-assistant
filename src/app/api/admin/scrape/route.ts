import { NextRequest, NextResponse } from 'next/server';
import { ZainBahrainScraper, PRODUCT_CATEGORIES } from '@/scraper/zain-scraper';
import { scrapeAllPlans, PLAN_CATEGORIES } from '@/scraper/plan-scraper';
import { getDb } from '@/lib/firebase';

export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
  const { type } = await request.json(); // type: 'products' | 'plans' | 'all'

  const db = getDb();
  const results: { type: string; saved: number; errors: number; summary: Record<string, number> }[] = [];

  try {
    if (type === 'products' || type === 'all') {
      const scraper = new ZainBahrainScraper();
      const productsRef = db.collection('products');
      let totalSaved = 0;
      let totalErrors = 0;
      const summary: Record<string, number> = {};

      await scraper.initialize(true);

      for (const cat of PRODUCT_CATEGORIES) {
        try {
          const products = await scraper.scrapeByCategory(cat.url, cat.category);
          let catSaved = 0;

          for (const product of products) {
            try {
              const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              const safeBrand = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              const docId = `${cat.category}-${safeBrand}-${safeName}`;

              await productsRef.doc(docId).set(
                { ...product, category: cat.category, categoryLabel: cat.label, updatedAt: new Date(), createdAt: new Date() },
                { merge: true }
              );
              catSaved++;
              totalSaved++;
            } catch {
              totalErrors++;
            }
          }

          summary[cat.label] = catSaved;
        } catch {
          summary[cat.label] = 0;
          totalErrors++;
        }
      }

      await scraper.close();
      results.push({ type: 'products', saved: totalSaved, errors: totalErrors, summary });
    }

    if (type === 'plans' || type === 'all') {
      const plansRef = db.collection('plans');
      let savedCount = 0;
      let errorCount = 0;
      const summary: Record<string, number> = {};

      const plans = await scrapeAllPlans();

      for (const plan of plans) {
        try {
          const safeName = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const docId = `${plan.category}-${plan.subCategory}-${safeName}`;
          await plansRef.doc(docId).set({ ...plan, updatedAt: new Date() }, { merge: true });
          savedCount++;
          const key = `${plan.category} / ${plan.subCategory}`;
          summary[key] = (summary[key] || 0) + 1;
        } catch {
          errorCount++;
        }
      }

      results.push({ type: 'plans', saved: savedCount, errors: errorCount, summary });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
