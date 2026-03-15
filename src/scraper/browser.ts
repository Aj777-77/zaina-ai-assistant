import puppeteer, { Browser, Page } from 'puppeteer';

let browser: Browser | null = null;

export interface BrowserConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

/**
 * Initialize and return a Puppeteer browser instance
 * Reuses existing browser if already initialized
 */
export async function getBrowser(config: BrowserConfig = {}): Promise<Browser> {
  if (browser && browser.connected) {
    return browser;
  }

  const {
    headless = true,
    timeout = 30000,
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  } = config;

  browser = await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--user-agent=${userAgent}`
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  return browser;
}

/**
 * Create a new page with common configurations
 */
export async function createPage(config: BrowserConfig = {}): Promise<Page> {
  const browserInstance = await getBrowser(config);
  const page = await browserInstance.newPage();

  // Set timeout
  page.setDefaultTimeout(config.timeout || 30000);

  // Block unnecessary resources to speed up scraping
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return page;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Navigate to a URL with error handling and retries
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'; retries?: number } = {}
): Promise<boolean> {
  const { waitUntil = 'networkidle2', retries = 3 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil, timeout: 30000 });
      return true;
    } catch (error) {
      console.error(`Navigation attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return false;
}

/**
 * Wait for and extract text content from a selector
 */
export async function extractText(page: Page, selector: string): Promise<string | null> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return await page.$eval(selector, el => el.textContent?.trim() || '');
  } catch (error) {
    console.warn(`Could not extract text from selector: ${selector}`);
    return null;
  }
}

/**
 * Extract multiple elements matching a selector
 */
export async function extractMultiple(page: Page, selector: string): Promise<string[]> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return await page.$$eval(selector, elements =>
      elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0)
    );
  } catch (error) {
    console.warn(`Could not extract multiple elements from selector: ${selector}`);
    return [];
  }
}

/**
 * Take a screenshot for debugging
 */
export async function takeScreenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot saved to: ${path}`);
}
