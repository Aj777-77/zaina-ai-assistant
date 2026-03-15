import puppeteer from 'puppeteer';

async function tryWithCustomHeaders() {
  console.log('🔍 Trying Zain e-shop with custom headers and user agent...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set extra HTTP headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
  });

  // Hide webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  const urlsToTry = [
    'https://eshop.bh.zain.com/',
    'https://www.bh.zain.com/en/personal/devices'
  ];

  for (const url of urlsToTry) {
    try {
      console.log(`\n🌐 Attempting: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const status = response?.status();
      console.log(`   HTTP Status: ${status}`);
      console.log(`   Final URL: ${page.url()}`);

      // Wait for any content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      const title = await page.title();
      console.log(`   Page Title: "${title}"`);

      // Get page content
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`   Body Text Sample:\n${bodyText}\n`);

      // Try to find any product-like elements
      const productCount = await page.$$eval('[class*="product"], [class*="device"], [class*="item"]', els => els.length).catch(() => 0);
      console.log(`   Found ${productCount} potential product elements`);

      if (status === 200 && productCount > 0) {
        console.log('   ✅ Success! Let me analyze the structure...');

        const structure = await page.evaluate(() => {
          const products = Array.from(document.querySelectorAll('[class*="product"], [class*="device"], [class*="item"]'))
            .slice(0, 3)
            .map(el => ({
              tagName: el.tagName,
              className: el.className,
              innerHTML: el.innerHTML.substring(0, 200)
            }));
          return products;
        });

        console.log('   Product structure:', JSON.stringify(structure, null, 2));
        break;
      }

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  await browser.close();
}

tryWithCustomHeaders();
