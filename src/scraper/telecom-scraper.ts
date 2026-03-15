import { Page } from 'puppeteer';
import { createPage, navigateToUrl, extractText, extractMultiple, closeBrowser } from './browser';

export interface PhoneProduct {
  name: string;
  price: string;
  description?: string;
  features?: string[];
  url: string;
  source: string;
}

export interface PlanProduct {
  name: string;
  price: string;
  data: string;
  minutes?: string;
  features?: string[];
  url: string;
  source: string;
}

/**
 * Generic scraper for telecom websites
 * This is a template that can be customized for specific sites
 */
export class TelecomScraper {
  private page: Page | null = null;

  /**
   * Initialize the scraper
   */
  async initialize(headless: boolean = true): Promise<void> {
    this.page = await createPage({ headless });
  }

  /**
   * Scrape phone products from a given URL
   * Note: Selectors need to be customized for each specific website
   */
  async scrapePhones(url: string, selectors: {
    container: string;
    name: string;
    price: string;
    description?: string;
    features?: string;
  }): Promise<PhoneProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`Scraping phones from: ${url}`);

    const success = await navigateToUrl(this.page, url);
    if (!success) {
      throw new Error(`Failed to navigate to ${url}`);
    }

    // Wait for product containers to load
    try {
      await this.page.waitForSelector(selectors.container, { timeout: 10000 });
    } catch (error) {
      console.error('Product container not found');
      return [];
    }

    // Extract product data
    const products: PhoneProduct[] = await this.page.$$eval(
      selectors.container,
      (containers, sel) => {
        return containers.map(container => {
          const nameEl = container.querySelector(sel.name);
          const priceEl = container.querySelector(sel.price);
          const descEl = sel.description ? container.querySelector(sel.description) : null;
          const linkEl = container.querySelector('a');

          return {
            name: nameEl?.textContent?.trim() || 'Unknown',
            price: priceEl?.textContent?.trim() || 'N/A',
            description: descEl?.textContent?.trim() || '',
            url: linkEl?.href || '',
            source: 'telecom-website'
          };
        });
      },
      selectors as any
    );

    console.log(`Found ${products.length} phone products`);
    return products;
  }

  /**
   * Scrape plan products from a given URL
   */
  async scrapePlans(url: string, selectors: {
    container: string;
    name: string;
    price: string;
    data: string;
  }): Promise<PlanProduct[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    console.log(`Scraping plans from: ${url}`);

    const success = await navigateToUrl(this.page, url);
    if (!success) {
      throw new Error(`Failed to navigate to ${url}`);
    }

    try {
      await this.page.waitForSelector(selectors.container, { timeout: 10000 });
    } catch (error) {
      console.error('Plan container not found');
      return [];
    }

    const plans: PlanProduct[] = await this.page.$$eval(
      selectors.container,
      (containers, sel) => {
        return containers.map(container => {
          const nameEl = container.querySelector(sel.name);
          const priceEl = container.querySelector(sel.price);
          const dataEl = container.querySelector(sel.data);
          const linkEl = container.querySelector('a');

          return {
            name: nameEl?.textContent?.trim() || 'Unknown Plan',
            price: priceEl?.textContent?.trim() || 'N/A',
            data: dataEl?.textContent?.trim() || 'N/A',
            url: linkEl?.href || '',
            source: 'telecom-website'
          };
        });
      },
      selectors as any
    );

    console.log(`Found ${plans.length} plan products`);
    return plans;
  }

  /**
   * Search for a specific product
   */
  async searchProduct(baseUrl: string, searchQuery: string, searchInputSelector: string = 'input[type="search"]'): Promise<void> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    await navigateToUrl(this.page, baseUrl);

    // Wait for search input and type query
    await this.page.waitForSelector(searchInputSelector);
    await this.page.type(searchInputSelector, searchQuery);

    // Submit search (press Enter)
    await this.page.keyboard.press('Enter');

    // Wait for navigation after search
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
      console.log('Navigation timeout, continuing...');
    });
  }

  /**
   * Close the scraper and browser
   */
  async close(): Promise<void> {
    await closeBrowser();
    this.page = null;
  }
}

/**
 * Example: Scrape from a demo/test site
 * This demonstrates the scraper structure
 */
export async function scrapeExampleSite(): Promise<PhoneProduct[]> {
  const scraper = new TelecomScraper();

  try {
    await scraper.initialize(true);

    // Example selectors - these would be customized for real telecom sites
    const products = await scraper.scrapePhones(
      'https://webscraper.io/test-sites/e-commerce/allinone/phones',
      {
        container: '.product-wrapper',
        name: '.title',
        price: '.price',
        description: '.description'
      }
    );

    return products;
  } finally {
    await scraper.close();
  }
}
