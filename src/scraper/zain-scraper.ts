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
  category: string;   // Firestore category value
  label: string;      // Human-readable label
  url: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    category: 'smartphones',
    label: 'Smartphones',
    url: 'https://eshop.bh.zain.com/product/smartphones',
  },
  {
    category: 'ipad-tablets-laptops',
    label: 'iPads, Tablets & Laptops',
    url: 'https://eshop.bh.zain.com/product/ipad-tablets-laptops',
  },
  {
    category: 'accessories',
    label: 'Accessories',
    url: 'https://eshop.bh.zain.com/product/accessories',
  },
  {
    category: 'vouchers',
    label: 'Vouchers',
    url: 'https://eshop.bh.zain.com/product/vouchers',
  },
  {
    category: 'home-solution-and-gaming',
    label: 'Home Solution & Gaming',
    url: 'https://eshop.bh.zain.com/product/home-solution-and-gaming',
  },
  {
    category: 'gift-cards',
    label: 'Gift Cards',
    url: 'https://eshop.bh.zain.com/product/gift-cards',
  },
  {
    category: 'smartwatches',
    label: 'Smartwatches',
    url: 'https://eshop.bh.zain.com/product/smartwatches',
  },
  {
    category: 'tv',
    label: 'TV',
    url: 'https://eshop.bh.zain.com/product/tv',
  },
];

/**
 * Specialized scraper for Zain Bahrain e-shop (eshop.bh.zain.com)
 */
export class ZainBahrainScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize the scraper with anti-detection measures
   */
  async initialize(headless: boolean = true): Promise<void> {
    this.browser = await getBrowser({
      headless,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await this.browser.newPage();

    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    // Hide automation indicators
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('✅ Zain Bahrain scraper initialized');
  }

  /**
   * Scrape all products from the main page, clicking "Load More" until all products are loaded
   */
  async scrapeMainPage(url: string = 'https://eshop.bh.zain.com/'): Promise<ZainProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`🔍 Scraping ${url}...`);

    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for product cards to appear in the DOM
    try {
      await this.page.waitForSelector('div.card-wrapper', { timeout: 10000 });
    } catch {
      // page may not have products — continue anyway
    }
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Keep clicking "Load More" until all products are visible (max 50 clicks)
    let loadMoreClicks = 0;
    while (loadMoreClicks < 50) {
      // Scroll to bottom so the button is in view
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));

      const urlBefore = this.page.url();

      // Only click <button> elements (never <a> tags which navigate away)
      const clicked = await this.page.evaluate(() => {
        const countBefore = document.querySelectorAll('div.card-wrapper').length;
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(el => {
          const text = el.textContent?.trim().toLowerCase() || '';
          return (
            text === 'load more' ||
            text === 'show more' ||
            text === 'view more' ||
            text === 'more products' ||
            text.includes('load more') ||
            text.includes('show more') ||
            text.includes('view more')
          );
        });
        if (btn && !btn.disabled) {
          btn.click();
          return countBefore;
        }
        return -1;
      });

      if (clicked === -1) break; // no button found

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // If clicking navigated away from this page, go back and stop
      const urlAfter = this.page.url();
      if (urlAfter !== urlBefore) {
        console.log(`  ↩️  "View More" navigated away — going back to ${urlBefore}`);
        await this.page.goto(urlBefore, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait for product cards to actually appear in the DOM
        try {
          await this.page.waitForSelector('div.card-wrapper', { timeout: 10000 });
        } catch {
          // no cards appeared — that's fine, we'll extract whatever is there
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      }

      // Verify new products actually loaded — if count didn't grow, stop
      const newCount = await this.page.evaluate(() => document.querySelectorAll('div.card-wrapper').length);
      if (newCount <= clicked) break;

      loadMoreClicks++;
      console.log(`  🔁 Load more clicked (${loadMoreClicks}x) — now ${newCount} products`);
    }

    if (loadMoreClicks > 0) {
      console.log(`  ✅ Loaded all pages after ${loadMoreClicks} "Load More" clicks`);
    }

    const products = await this.page.evaluate(() => {
      const productCards = Array.from(document.querySelectorAll('div.card-wrapper'));

      return productCards.map(card => {
        // Get brand
        const brandEl = card.querySelector('.card-body .paragraph-p-3');
        const brand = brandEl?.textContent?.trim() || 'Unknown';

        // Get product name
        const nameEl = card.querySelector('.card-body .weight-700');
        const name = nameEl?.textContent?.trim() || 'Unknown Product';

        // Get image
        const imgEl = card.querySelector('img.item-image');
        const imageUrl = imgEl?.getAttribute('src') || '';

        // Get product URL
        const linkEl = card.querySelector('a.text-hover-card, a[href*="/product/"]');
        const productUrl = linkEl?.getAttribute('href') || '';

        // Get savings/offer
        const savingsEl = card.querySelector('.card-header span');
        const savings = savingsEl?.textContent?.trim() || '';

        // Get pricing
        const footerEl = card.querySelector('.card-footer');
        const footerText = footerEl?.textContent || '';

        // Extract monthly price
        const monthlyMatch = footerText.match(/BD\s*([\d.]+)\s*\/mo/);
        const monthlyPrice = monthlyMatch ? `BD ${monthlyMatch[1]} /mo` : '';

        // Extract cash price
        const cashMatch = footerText.match(/Cash Price[\s\S]*?BD\s*([\d.]+)/);
        const cashPrice = cashMatch ? `BD ${cashMatch[1]}` : '';

        // Use whichever price is available
        const price = cashPrice || monthlyPrice || 'N/A';

        return {
          name,
          brand,
          price,
          cashPrice,
          monthlyPrice,
          savings,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://eshop.bh.zain.com${imageUrl}`,
          productUrl: productUrl.startsWith('http') ? productUrl : `https://eshop.bh.zain.com${productUrl}`,
          scrapedAt: new Date()
        };
      });
    });

    console.log(`✅ Scraped ${products.length} products from ${url}`);

    return products;
  }

  /**
   * Scrape products by category — handles subcategory pages automatically
   */
  async scrapeByCategory(categoryUrl: string): Promise<ZainProduct[]> {
    if (!this.page) throw new Error('Scraper not initialized. Call initialize() first.');

    // First attempt: scrape the category page directly
    const products = await this.scrapeMainPage(categoryUrl);

    if (products.length > 0) return products;

    // If 0 products found, the page may show subcategory tiles — discover and scrape each
    console.log(`  ℹ️  No products on ${categoryUrl}, checking for subcategories...`);

    const subcategoryUrls = await this.page.evaluate((baseUrl: string) => {
      const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const base = new URL(baseUrl);

      return links
        .map(a => a.href)
        .filter(href => {
          try {
            const u = new URL(href);
            // Must be same origin, under /product/, deeper than the current path, and not the same page
            return (
              u.origin === base.origin &&
              u.pathname.startsWith(base.pathname + '/') &&
              u.pathname !== base.pathname
            );
          } catch {
            return false;
          }
        })
        .filter((href, i, arr) => arr.indexOf(href) === i); // deduplicate
    }, categoryUrl);

    if (subcategoryUrls.length === 0) {
      console.log(`  ⚠️  No subcategories found for ${categoryUrl}`);
      return [];
    }

    console.log(`  📂 Found ${subcategoryUrls.length} subcategories, scraping each...`);

    const allProducts: ZainProduct[] = [];

    for (const subUrl of subcategoryUrls) {
      console.log(`    ↳ Scraping subcategory: ${subUrl}`);
      const subProducts = await this.scrapeMainPage(subUrl);
      allProducts.push(...subProducts);
    }

    return allProducts;
  }

  /**
   * Search for specific products
   */
  async searchProducts(query: string): Promise<ZainProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`🔎 Searching for: "${query}"`);

    await this.page.goto('https://eshop.bh.zain.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    try {
      // Look for search input
      const searchSelector = 'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]';
      await this.page.waitForSelector(searchSelector, { timeout: 5000 });

      await this.page.type(searchSelector, query);
      await this.page.keyboard.press('Enter');

      await new Promise(resolve => setTimeout(resolve, 5000));

      return await this.scrapeMainPage();
    } catch (error) {
      console.warn('Search functionality not available, returning main page results');
      return await this.scrapeMainPage();
    }
  }

  /**
   * Get product categories available
   */
  async getCategories(): Promise<Array<{ name: string; url: string }>> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    await this.page.goto('https://eshop.bh.zain.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const categories = await this.page.evaluate(() => {
      const categoryLinks = Array.from(document.querySelectorAll('a[href]'));

      return categoryLinks
        .map(a => ({
          name: a.textContent?.trim() || '',
          url: a.getAttribute('href') || ''
        }))
        .filter(cat =>
          cat.name &&
          cat.url &&
          (cat.url.includes('/category/') ||
           cat.url.includes('/devices') ||
           cat.url.includes('/products') ||
           cat.name.toLowerCase().includes('apple') ||
           cat.name.toLowerCase().includes('samsung') ||
           cat.name.toLowerCase().includes('phone'))
        )
        .slice(0, 20);
    });

    return categories;
  }

  /**
   * Close the scraper
   */
  async close(): Promise<void> {
    await closeBrowser();
    this.browser = null;
    this.page = null;
  }
}

/**
 * Quick scrape function for Zain Bahrain main page
 */
export async function scrapeZainBahrain(): Promise<ZainProduct[]> {
  const scraper = new ZainBahrainScraper();

  try {
    await scraper.initialize();
    return await scraper.scrapeMainPage();
  } finally {
    await scraper.close();
  }
}
