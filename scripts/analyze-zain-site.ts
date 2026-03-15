import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function analyzeZainSite() {
  console.log('🔍 Analyzing https://eshop.bh.zain.com/...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Navigate to Zain Bahrain e-shop
    await page.goto('https://eshop.bh.zain.com/', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    console.log('✅ Successfully loaded the page\n');

    // Get page title
    const title = await page.title();
    console.log('📄 Page Title:', title);
    console.log('🔗 URL:', page.url());

    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for common product selectors
    const selectors = [
      'div.product',
      'div.product-card',
      'div.product-item',
      'article.product',
      '[data-product]',
      '.ProductCard',
      '.product-tile',
      'div[class*="product"]',
      'div[class*="Product"]',
      '.card',
      '[class*="Card"]',
      'a[href*="product"]',
      'a[href*="/p/"]',
      '[data-testid*="product"]'
    ];

    console.log('\n🔎 Checking for product containers...\n');

    const foundSelectors: { selector: string; count: number }[] = [];

    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, els => els.length);
        if (count > 0) {
          console.log(`✓ Found ${count} elements with selector: ${selector}`);
          foundSelectors.push({ selector, count });
        }
      } catch (error) {
        // Selector not found, continue
      }
    }

    // Get main navigation links
    console.log('\n🔗 Main Navigation Links:\n');
    const navLinks = await page.$$eval('a[href]', links =>
      links
        .map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
        .filter(l => l.text && l.text.length > 0 && l.text.length < 50)
        .slice(0, 20)
    );

    navLinks.forEach(link => {
      if (link.href?.includes('product') || link.href?.includes('phone') || link.href?.includes('device')) {
        console.log(`  - ${link.text}: ${link.href}`);
      }
    });

    // Check for category pages or product listing pages
    console.log('\n📱 Looking for product categories...\n');
    const categoryLinks = await page.$$eval('a[href]', links =>
      links
        .map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
        .filter(l =>
          l.href && (
            l.href.includes('phone') ||
            l.href.includes('device') ||
            l.href.includes('mobile') ||
            l.href.includes('shop') ||
            l.href.includes('category')
          )
        )
        .slice(0, 10)
    );

    categoryLinks.forEach(link => {
      console.log(`  📂 ${link.text}: ${link.href}`);
    });

    // Get sample HTML from body
    const bodyHTML = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerHTML.substring(0, 10000);
    });

    // Save HTML sample for manual inspection
    const outputPath = path.join(process.cwd(), 'zain-html-sample.html');
    fs.writeFileSync(outputPath, bodyHTML);
    console.log(`\n💾 HTML sample saved to: ${outputPath}`);

    // Take a screenshot
    const screenshotPath = path.join(process.cwd(), 'zain-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);

    console.log('\n📊 Summary:');
    console.log(`   - Found ${foundSelectors.length} potential product selectors`);
    console.log(`   - Found ${categoryLinks.length} category/product links`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

analyzeZainSite();
