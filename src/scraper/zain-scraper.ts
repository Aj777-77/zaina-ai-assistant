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
   * Scrape all products from the main page
   */
  async scrapeMainPage(): Promise<ZainProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log('🔍 Scraping Zain Bahrain main page...');

    await this.page.goto('https://eshop.bh.zain.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 5000));

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

    console.log(`✅ Scraped ${products.length} products from Zain Bahrain`);

    return products;
  }

  /**
   * Scrape products by category
   */
  async scrapeByCategory(categoryUrl: string): Promise<ZainProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`🔍 Scraping category: ${categoryUrl}`);

    await this.page.goto(categoryUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    return await this.scrapeMainPage();
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
