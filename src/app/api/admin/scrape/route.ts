import { NextRequest, NextResponse } from 'next/server';
import { ZainBahrainScraper, PRODUCT_CATEGORIES, ZainProduct } from '@/scraper/zain-scraper';
import { scrapeAllPlans, ZainPlan } from '@/scraper/plan-scraper';
import { getDb } from '@/lib/firebase';

export const maxDuration = 300;

async function clearCollection(collectionPath: string) {
  const db = getDb();
  const ref = db.collection(collectionPath);
  const batchSize = 100;
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

type ScrapedProduct = ZainProduct & { category: string; categoryLabel: string };

type PreviewData = {
  products?: { items: ScrapedProduct[]; summary: Record<string, number> };
  plans?: { items: ZainPlan[]; summary: Record<string, number> };
};

export async function POST(request: NextRequest) {
  const { type, action, data } = await request.json() as {
    type: 'products' | 'plans' | 'all';
    action: 'preview' | 'save';
    data?: PreviewData;
  };

  const db = getDb();

  try {
    // ── STEP 1: Scrape only, return preview data ──────────────────────────
    if (action === 'preview') {
      const preview: PreviewData = {};

      if (type === 'products' || type === 'all') {
        const scraper = new ZainBahrainScraper();
        const items: ScrapedProduct[] = [];
        const summary: Record<string, number> = {};

        await scraper.initialize(true);
        for (const cat of PRODUCT_CATEGORIES) {
          try {
            const products = await scraper.scrapeByCategory(cat.url, cat.category);
            products.forEach(p => items.push({ ...p, category: cat.category, categoryLabel: cat.label }));
            summary[cat.label] = products.length;
          } catch {
            summary[cat.label] = 0;
          }
        }
        await scraper.close();
        preview.products = { items, summary };
      }

      if (type === 'plans' || type === 'all') {
        const plans = await scrapeAllPlans();
        const summary: Record<string, number> = {};
        plans.forEach(p => {
          const key = `${p.category} / ${p.subCategory}`;
          summary[key] = (summary[key] || 0) + 1;
        });
        preview.plans = { items: plans, summary };
      }

      return NextResponse.json({ success: true, preview });
    }

    // ── STEP 2: Delete old data, save confirmed scraped data ──────────────
    if (action === 'save' && data) {
      const results: { type: string; saved: number; errors: number; summary: Record<string, number> }[] = [];

      if (data.products) {
        await clearCollection('products');
        const productsRef = db.collection('products');
        let saved = 0, errors = 0;
        const summary: Record<string, number> = {};

        for (const product of data.products.items) {
          try {
            const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const safeBrand = product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const docId = `${product.category}-${safeBrand}-${safeName}`;
            await productsRef.doc(docId).set({
              ...product,
              updatedAt: new Date(),
              createdAt: new Date(),
            });
            saved++;
            summary[product.categoryLabel] = (summary[product.categoryLabel] || 0) + 1;
          } catch {
            errors++;
          }
        }

        results.push({ type: 'products', saved, errors, summary });
      }

      if (data.plans) {
        await clearCollection('plans');
        const plansRef = db.collection('plans');
        let saved = 0, errors = 0;
        const summary: Record<string, number> = {};

        for (const plan of data.plans.items) {
          try {
            const safeName = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const docId = `${plan.category}-${plan.subCategory}-${safeName}`;
            await plansRef.doc(docId).set({ ...plan, updatedAt: new Date() });
            saved++;
            const key = `${plan.category} / ${plan.subCategory}`;
            summary[key] = (summary[key] || 0) + 1;
          } catch {
            errors++;
          }
        }

        results.push({ type: 'plans', saved, errors, summary });
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: 'Invalid action or missing data' }, { status: 400 });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
