import { Page, Browser } from 'puppeteer';
import { getBrowser, closeBrowser } from './browser';

export interface ZainProduct {
  name: string;
  brand: string;
  price: string;
  cashPrice?: string;
  monthlyPrice?: string;
  savings?: string;
  imageUrl: string;
  productUrl: string;
  category?: string;
  scrapedAt: Date;
}

export interface ProductCategory {
  category: string;
  label: string;
  url: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { category: 'smartphones',            label: 'Smartphones',              url: 'https://eshop.bh.zain.com/product/smartphones' },
  { category: 'ipad-tablets-laptops',   label: 'iPads, Tablets & Laptops', url: 'https://eshop.bh.zain.com/product/ipad-tablets-laptops' },
  { category: 'accessories',            label: 'Accessories',              url: 'https://eshop.bh.zain.com/product/accessories' },
  { category: 'vouchers',               label: 'Vouchers',                 url: 'https://eshop.bh.zain.com/product/vouchers' },
  { category: 'home-solution-and-gaming', label: 'Home Solution & Gaming', url: 'https://eshop.bh.zain.com/product/home-solution-and-gaming' },
  { category: 'gift-cards',             label: 'Gift Cards',               url: 'https://eshop.bh.zain.com/product/gift-cards' },
  { category: 'smartwatches',           label: 'Smartwatches',             url: 'https://eshop.bh.zain.com/product/smartwatches' },
  { category: 'tv',                     label: 'TV',                       url: 'https://eshop.bh.zain.com/product/tv' },
];

const CARD_SELECTORS = ['div.card-wrapper', 'div.product-card', 'div.product-item', 'li.product-item', 'article.product'];

export class ZainBahrainScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(headless: boolean = true): Promise<void> {
    this.browser = await getBrowser({
      headless,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    this.page = await this.createFreshPage();
    console.log('✅ Zain Bahrain scraper initialized');
  }

  /** Create a new configured page on the shared browser. */
  private async createFreshPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not initialized.');
    const page = await this.browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    return page;
  }

  /**
   * Return the current page, recreating it if the frame has become detached.
   * This fixes the "Attempted to use detached Frame" errors that appear after
   * a page goes through multiple navigations / Load More cycles.
   */
  private async getPage(): Promise<Page> {
    if (this.page) {
      try {
        await this.page.evaluate(() => true); // smoke-test: throws if frame detached
        return this.page;
      } catch {
        console.log('  ♻️  Page frame detached — creating fresh page');
        try { await this.page.close(); } catch { /* already closed */ }
        this.page = null;
      }
    }
    this.page = await this.createFreshPage();
    return this.page;
  }

  /** Navigate with up to 3 retries. Recovers a detached page between attempts. */
  private async navigate(url: string, timeout = 60000): Promise<Page> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const page = await this.getPage();
      try {
        // Use domcontentloaded instead of networkidle2 to avoid WAF/SPA 60s timeouts
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        // Wait a bit for angular components to load after DOM is ready
        await new Promise(r => setTimeout(r, 6000));
        return page;
      } catch (err) {
        console.warn(`  ⚠️  Navigation attempt ${attempt}/3 failed for ${url}: ${err}`);
        if (attempt < 3) {
          // Force page recreation on next attempt so we don't retry on a broken frame
          try { await this.page?.close(); } catch { /* ignore */ }
          this.page = null;
          await new Promise(r => setTimeout(r, attempt * 3000));
        }
      }
    }
    throw new Error(`Navigation failed after 3 attempts: ${url}`);
  }

  /**
   * Scroll the page (triggers lazy-loaded content) then wait for ANY card
   * selector using waitForFunction — a single 20-second budget covers all
   * selectors at once so Angular has enough time to finish rendering.
   */
  private async detectCardSelector(page: Page): Promise<string> {
    // Scroll to bottom → back to top to trigger lazy-loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    try {
      // Poll every 500 ms for up to 20 s — stops the moment any selector appears
      const found = await page.waitForFunction(
        (sels: string[]) => sels.find(s => document.querySelector(s) !== null) || '',
        { timeout: 20000, polling: 500 },
        CARD_SELECTORS,
      );
      const sel = await found.jsonValue() as string;
      if (sel) {
        console.log(`  ✔  Card selector matched: ${sel}`);
        return sel;
      }
    } catch {
      /* timeout — fall through to debug logging */
    }

    const pageClasses = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[class]'));
      const classes = new Set<string>();
      els.forEach(el => el.classList.forEach(c => classes.add(c)));
      return Array.from(classes).slice(0, 80).join(', ');
    });
    console.warn(`  ⚠️  No card selector matched. Classes on page: ${pageClasses}`);
    return CARD_SELECTORS[0]; // fallback
  }

  /** Extract all products from the already-navigated page, clicking Load More until exhausted. */
  private async extractProducts(page: Page, url: string): Promise<ZainProduct[]> {
    const cardSel = await this.detectCardSelector(page);

    let loadMoreClicks = 0;
    while (loadMoreClicks < 30) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 800));

      const urlBefore = page.url();

      const countBefore = await page.evaluate((sel: string) => {
        const count = document.querySelectorAll(sel).length;
        const btn = Array.from(document.querySelectorAll('button')).find(el => {
          const text = el.textContent?.trim().toLowerCase() || '';
          return text.includes('load more') || text.includes('show more') || text.includes('view more') || text === 'more products';
        });
        if (btn && !(btn as HTMLButtonElement).disabled) {
          btn.click();
          return count;
        }
        return -1;
      }, cardSel);

      if (countBefore === -1) break;

      await new Promise(r => setTimeout(r, 1500));

      if (page.url() !== urlBefore) {
        console.log(`  ↩️  Load More navigated away — returning to ${urlBefore}`);
        await page.goto(urlBefore, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000));
        try { await page.waitForSelector(cardSel, { timeout: 10000 }); } catch { /* ok */ }
        break;
      }

      const newCount = await page.evaluate((sel: string) => document.querySelectorAll(sel).length, cardSel);
      if (newCount <= countBefore) break;

      loadMoreClicks++;
      console.log(`  🔁 Load more (${loadMoreClicks}x) — ${newCount} products`);
    }

    if (loadMoreClicks > 0) {
      console.log(`  ✅ All pages loaded after ${loadMoreClicks} "Load More" clicks`);
    }

    const products = await page.evaluate((sel: string) => {
      return Array.from(document.querySelectorAll(sel)).map(card => {
        const brand    = card.querySelector('.card-body .paragraph-p-3')?.textContent?.trim() || 'Unknown';
        const name     = card.querySelector('.card-body .weight-700')?.textContent?.trim() || 'Unknown Product';
        const imageUrl = card.querySelector('img.item-image, img[src]')?.getAttribute('src') || '';
        const productUrl = card.querySelector('a.text-hover-card, a[href*="/product/"]')?.getAttribute('href') || '';
        const savings  = card.querySelector('.card-header span')?.textContent?.trim() || '';
        const footerText = card.querySelector('.card-footer')?.textContent || '';
        const monthlyMatch = footerText.match(/BD\s*([\d.]+)\s*\/mo/);
        const monthlyPrice = monthlyMatch ? `BD ${monthlyMatch[1]} /mo` : '';
        const cashMatch = footerText.match(/Cash Price[\s\S]*?BD\s*([\d.]+)/);
        const cashPrice = cashMatch ? `BD ${cashMatch[1]}` : '';
        const price = cashPrice || monthlyPrice || 'N/A';
        return {
          name, brand, price, cashPrice, monthlyPrice, savings,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://eshop.bh.zain.com${imageUrl}`,
          productUrl: productUrl.startsWith('http') ? productUrl : `https://eshop.bh.zain.com${productUrl}`,
          scrapedAt: new Date(),
        };
      });
    }, cardSel);

    if (products.length === 0) {
      console.warn(`  ⚠️  0 products extracted from ${url} (selector: ${cardSel})`);
    } else {
      console.log(`  ✅ Scraped ${products.length} products from ${url}`);
    }

    return products;
  }

  /** Navigate to URL and scrape all products (with Load More pagination). */
  async scrapeMainPage(url: string = 'https://eshop.bh.zain.com/'): Promise<ZainProduct[]> {
    console.log(`🔍 Scraping ${url}...`);
    const page = await this.navigate(url);
    return this.extractProducts(page, url);
  }

  /**
   * Scrape a category URL. If the page shows brand/subcategory tiles instead of
   * product cards, discovers linked pages and scrapes each one.
   */
  async scrapeByCategory(categoryUrl: string, categoryTag?: string): Promise<ZainProduct[]> {
    console.log(`🔍 Scraping ${categoryUrl}...`);
    const page = await this.navigate(categoryUrl);

    // 1st attempt — try to extract products directly from this page
    let products = await this.extractProducts(page, categoryUrl);
    if (products.length > 0) {
      return categoryTag ? products.map(p => ({ ...p, category: categoryTag })) : products;
    }

    // 2nd attempt — look for subcategory / brand links on the current page
    console.log(`  ℹ️  No products directly on ${categoryUrl} — scanning for subcategory links...`);

    const baseSeg = new URL(categoryUrl).pathname.split('/').filter(Boolean).pop() || '';

    let subcategoryUrls: string[] = await page.evaluate((baseUrl: string, seg: string) => {
      const base = new URL(baseUrl);
      return Array.from(document.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>)
        .map(a => a.href)
        .filter(href => {
          try {
            const u = new URL(href);
            if (u.origin !== base.origin) return false;
            if (u.pathname === base.pathname) return false;
            if (u.pathname.startsWith('/product/plans')) return false;
            if (u.pathname.startsWith(base.pathname + '/')) return true;
            if (u.pathname.startsWith('/product/') && u.pathname.includes(seg)) return true;
            return false;
          } catch { return false; }
        })
        .filter((h, i, arr) => arr.indexOf(h) === i);
    }, categoryUrl, baseSeg);

    // 3rd attempt — broaden to any /product/ link visible on the page
    if (subcategoryUrls.length === 0) {
      console.log(`  ℹ️  No subcategory links found — trying all /product/ links on page...`);
      subcategoryUrls = await page.evaluate((baseUrl: string) => {
        const base = new URL(baseUrl);
        return Array.from(document.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>)
          .map(a => a.href)
          .filter(href => {
            try {
              const u = new URL(href);
              return (
                u.origin === base.origin &&
                u.pathname.startsWith('/product/') &&
                u.pathname !== base.pathname &&
                !u.pathname.startsWith('/product/plans')
              );
            } catch { return false; }
          })
          .filter((h, i, arr) => arr.indexOf(h) === i)
          .slice(0, 15);
      }, categoryUrl);
    }

    if (subcategoryUrls.length === 0) {
      console.warn(`  ⚠️  No subcategories or product links found for ${categoryUrl}`);
      return [];
    }

    console.log(`  📂 Found ${subcategoryUrls.length} subcategory pages — scraping each...`);
    const allProducts: ZainProduct[] = [];

    for (const subUrl of subcategoryUrls) {
      console.log(`    ↳ ${subUrl}`);
      const subProducts = await this.scrapeMainPage(subUrl);
      allProducts.push(...subProducts);
    }

    return categoryTag ? allProducts.map(p => ({ ...p, category: categoryTag })) : allProducts;
  }

  async close(): Promise<void> {
    await closeBrowser();
    this.browser = null;
    this.page = null;
  }
}

export async function scrapeZainBahrain(): Promise<ZainProduct[]> {
  const scraper = new ZainBahrainScraper();
  try {
    await scraper.initialize();
    return await scraper.scrapeMainPage();
  } finally {
    await scraper.close();
  }
}
