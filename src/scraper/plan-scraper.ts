import { getBrowser, closeBrowser } from './browser';

export interface ZainPlan {
  name: string;
  banner: string;
  price: string;
  priceAmount: number;
  data: string;
  features: string[];
  category: string;
  subCategory: string;
  planUrl: string;
  scrapedAt: Date;
}

export interface PlanCategory {
  category: string;       // e.g. "mobile", "broadband"
  subCategory: string;    // e.g. "postpaid_contract", "fiber_commitment"
  label: string;          // Human-readable label
  url: string;
}

export const PLAN_CATEGORIES: PlanCategory[] = [
  // Mobile Plans
  {
    category: 'mobile',
    subCategory: 'postpaid_contract',
    label: 'Postpaid with Contract',
    url: 'https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10',
  },
  {
    category: 'mobile',
    subCategory: 'postpaid_no_contract',
    label: 'Postpaid without Contract',
    url: 'https://eshop.bh.zain.com/product/plans_mobile_wiyana_postpaid_no_contract/plans?service_type=13&service_plan_type=14&contract_type=9',
  },
  {
    category: 'mobile',
    subCategory: 'prepaid',
    label: 'Prepaid',
    url: 'https://eshop.bh.zain.com/product/plans_mobile_prepaid_no_contract/plans?service_type=13&service_plan_type=15&contract_type=9',
  },
  {
    category: 'mobile',
    subCategory: 'youth_postpaid',
    label: 'Youth Postpaid',
    url: 'https://eshop.bh.zain.com/product/plans_mobile_youth_youth_postpaid/plans?service_type=13&service_plan_type=143&contract_type=316',
  },
  {
    category: 'mobile',
    subCategory: 'youth_prepaid',
    label: 'Youth Prepaid',
    url: 'https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=143&contract_type=315',
  },
  {
    category: 'mobile',
    subCategory: 'alzain_postpaid',
    label: 'Al Zain Postpaid',
    url: 'https://eshop.bh.zain.com/product/plans_mobile_al_zain_no_commitment/plans?service_type=13&service_plan_type=17&contract_type=105',
  },
  // Broadband – Fiber
  {
    category: 'broadband',
    subCategory: 'fiber_commitment',
    label: 'Fiber with Commitment',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_fiber_commitment/plans?service_type=18&service_plan_type=19&contract_type=103',
  },
  {
    category: 'broadband',
    subCategory: 'fiber_no_commitment',
    label: 'Fiber without Commitment',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_fiber_no_commitment/plans?service_type=18&service_plan_type=19&contract_type=105',
  },
  {
    category: 'broadband',
    subCategory: 'fiber_switch',
    label: 'Switch Your Fiber to Zain',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_fiber_switch_your_fiber_zain/plans?service_type=18&service_plan_type=19&contract_type=171',
  },
  {
    category: 'broadband',
    subCategory: 'fiber_gaming',
    label: 'Fiber Gaming',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_fiber_fiber_gaming/plans?service_type=18&service_plan_type=19&contract_type=310',
  },
  // Broadband – 5G HBB
  {
    category: 'broadband',
    subCategory: '5g_24months',
    label: '5G Home Broadband 24 Months',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_5g_home_broadband_24_months/plans?service_type=18&service_plan_type=20&contract_type=12',
  },
  {
    category: 'broadband',
    subCategory: '5g_12months',
    label: '5G Home Broadband 12 Months',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_5g_home_broadband_12_months/plans?service_type=18&service_plan_type=20&contract_type=10',
  },
  {
    category: 'broadband',
    subCategory: '5g_switch',
    label: '5G Switch Your Home Broadband to Zain',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_5g_home_broadband_switch_your_home_broadband_zain/plans?service_type=18&service_plan_type=20&contract_type=173',
  },
  {
    category: 'broadband',
    subCategory: '5g_gaming',
    label: '5G HBB Gaming',
    url: 'https://eshop.bh.zain.com/product/plans?service_type=18&service_plan_type=20&contract_type=430',
  },
  // Broadband – Mobile Broadband
  {
    category: 'broadband',
    subCategory: 'mobile_broadband_12months',
    label: 'Mobile Broadband 12 Months',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_mobile_broadband_12_months/plans?service_type=18&service_plan_type=22&contract_type=10',
  },
  {
    category: 'broadband',
    subCategory: 'mobile_broadband_no_commitment',
    label: 'Mobile Broadband No Commitment',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_mobile_broadband_no_commitment/plans?service_type=18&service_plan_type=22&contract_type=105',
  },
  {
    category: 'broadband',
    subCategory: 'prepaid_broadband',
    label: 'Prepaid Broadband',
    url: 'https://eshop.bh.zain.com/product/plans_broadband_prepaid_data_no_contract/plans?service_type=18&service_plan_type=101&contract_type=9',
  },
];

/**
 * Scrape all plan cards from a given plan page URL
 */
export async function scrapePlansFromUrl(url: string, category: string, subCategory: string): Promise<ZainPlan[]> {
  const browser = await getBrowser({
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  console.log(`  → Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 5000));

  const plans = await page.evaluate((cat: string, subCat: string, pageUrl: string) => {
    const cards = Array.from(document.querySelectorAll('.card-container'));

    return cards.map(card => {
      // Banner / offer text
      const bannerEl = card.querySelector('.card-header span');
      const banner = bannerEl?.textContent?.trim() || '';

      // Plan name
      const nameEl = card.querySelector('.heading-text-collapse');
      const name = nameEl?.textContent?.trim() || 'Unknown Plan';

      // Data benefit (e.g. "21GB* Data")
      const benefitEl = card.querySelector('.benefit h3');
      const data = benefitEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

      // Price – combine main text + decimal span (e.g. "BD 10" + ".300" = "BD 10.300")
      const installmentEl = card.querySelector('.installment h3');
      let priceText = '';
      let priceAmount = 0;
      if (installmentEl) {
        // Get all text nodes directly in h3 (before/after the <span>)
        let main = '';
        installmentEl.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) main += node.textContent || '';
          else if ((node as Element).tagName === 'SPAN') main += (node as Element).textContent || '';
        });
        priceText = main.trim().replace(/\s+/g, ' ');

        // Parse numeric amount
        const match = priceText.match(/[\d.]+/);
        priceAmount = match ? parseFloat(match[0]) : 0;
      }

      // Features list – collect text from plan-item spans (skip empty alt-only items)
      const featureItems = Array.from(card.querySelectorAll('.plan-item'));
      const features: string[] = [];
      featureItems.forEach(item => {
        // Try the span text first
        const spanEl = item.querySelector('span.pl-3');
        if (spanEl) {
          const text = spanEl.textContent?.trim().replace(/\s+/g, ' ');
          if (text) features.push(text);
          return;
        }
        // Fallback: img alt attribute
        const imgEl = item.querySelector('img');
        const alt = imgEl?.getAttribute('alt')?.trim();
        if (alt && alt !== 'zain' && alt !== 'eshop') features.push(alt);
      });

      return {
        name,
        banner,
        price: `BD ${priceText.replace(/^BD\s*/i, '')}`.trim(),
        priceAmount,
        data,
        features,
        category: cat,
        subCategory: subCat,
        planUrl: pageUrl,
        scrapedAt: new Date(),
      };
    });
  }, category, subCategory, url);

  await page.close();
  return plans;
}

/**
 * Scrape all plan categories and return a flat array
 */
export async function scrapeAllPlans(): Promise<ZainPlan[]> {
  const all: ZainPlan[] = [];

  try {
    for (const cat of PLAN_CATEGORIES) {
      console.log(`\n📋 Scraping [${cat.label}]...`);
      try {
        const plans = await scrapePlansFromUrl(cat.url, cat.category, cat.subCategory);
        console.log(`  ✅ Found ${plans.length} plans`);
        all.push(...plans);
      } catch (err) {
        console.error(`  ❌ Failed: ${err}`);
      }
    }
  } finally {
    await closeBrowser();
  }

  return all;
}
