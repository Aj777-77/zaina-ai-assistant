import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function analyzeZainProducts() {
  console.log('🔍 Analyzing Zain Bahrain product structure...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Set realistic headers
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    console.log('🌐 Loading https://eshop.bh.zain.com/...');

    await page.goto('https://eshop.bh.zain.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded successfully\n');

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Find product card selectors
    console.log('🔎 Analyzing product card structure...\n');

    const productSelectors = await page.evaluate(() => {
      // Try to find the actual product cards
      const potentialProducts = Array.from(document.querySelectorAll('div[class*="card"], div[class*="product"], a[class*="card"]'));

      const filtered = potentialProducts.filter(el => {
        const text = el.textContent || '';
        const html = el.innerHTML;
        // Look for price indicators
        return (text.includes('BD') || text.includes('Starting from') || html.includes('price'));
      });

      return filtered.slice(0, 5).map(el => ({
        tagName: el.tagName,
        classList: Array.from(el.classList),
        textContent: (el.textContent || '').substring(0, 200),
        innerHTML: el.innerHTML.substring(0, 500)
      }));
    });

    console.log('Found product-like elements:');
    console.log(JSON.stringify(productSelectors, null, 2));

    // Try specific selectors for Zain
    const specificSelectors = [
      'app-product-card',
      'div.product-card',
      'app-product-list-card',
      'div[class*="ProductCard"]',
      'section div.card',
      'a[href*="/product/"]',
      'a[href*="/device/"]'
    ];

    console.log('\n🎯 Testing specific selectors...\n');

    for (const selector of specificSelectors) {
      try {
        const count = await page.$$eval(selector, els => els.length);
        if (count > 0) {
          console.log(`✓ ${selector}: ${count} elements`);

          // Get sample data from first element
          const sampleData = await page.$$eval(selector, (elements) => {
            const first = elements[0];
            return {
              className: first.className,
              innerHTML: first.innerHTML.substring(0, 300)
            };
          });

          console.log(`  Sample:`, JSON.stringify(sampleData, null, 4));
        }
      } catch (error) {
        // Skip
      }
    }

    // Save full HTML for manual inspection
    const html = await page.content();
    fs.writeFileSync('zain-full-page.html', html);
    console.log('\n💾 Full page HTML saved to: zain-full-page.html');

    // Take screenshot
    await page.screenshot({ path: 'zain-products-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to: zain-products-screenshot.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

analyzeZainProducts();
