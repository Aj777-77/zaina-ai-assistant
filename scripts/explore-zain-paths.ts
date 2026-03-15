import puppeteer from 'puppeteer';

async function exploreZainPaths() {
  console.log('🔍 Exploring Zain Bahrain e-shop paths...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const pathsToTry = [
    'https://eshop.bh.zain.com/',
    'https://eshop.bh.zain.com/en',
    'https://eshop.bh.zain.com/ar',
    'https://eshop.bh.zain.com/shop',
    'https://eshop.bh.zain.com/products',
    'https://eshop.bh.zain.com/devices',
    'https://eshop.bh.zain.com/phones',
    'https://www.bh.zain.com/',
    'https://www.bh.zain.com/en',
    'https://www.bh.zain.com/en/personal'
  ];

  for (const url of pathsToTry) {
    try {
      console.log(`\n🌐 Trying: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      const status = response?.status() || 'unknown';
      const finalUrl = page.url();
      const title = await page.title();

      console.log(`   Status: ${status}`);
      console.log(`   Final URL: ${finalUrl}`);
      console.log(`   Title: ${title || '(empty)'}`);

      if (status === 200) {
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for common content indicators
        const hasProducts = await page.$('div[class*="product"], a[href*="product"]').then(() => true).catch(() => false);
        const hasDevices = await page.$('div[class*="device"], a[href*="device"]').then(() => true).catch(() => false);
        const hasShop = await page.$('div[class*="shop"], a[href*="shop"]').then(() => true).catch(() => false);

        if (hasProducts || hasDevices || hasShop) {
          console.log(`   ✅ Found product-related content!`);

          // Get some links
          const links = await page.$$eval('a[href]', anchors =>
            anchors
              .map(a => ({ text: a.textContent?.trim(), href: a.href }))
              .filter(l =>
                l.href && l.text &&
                (l.href.includes('product') || l.href.includes('device') ||
                 l.href.includes('phone') || l.href.includes('shop'))
              )
              .slice(0, 10)
          );

          console.log(`   📋 Found ${links.length} product-related links`);
          links.forEach(link => {
            console.log(`      - ${link.text}: ${link.href}`);
          });

          break; // Found the right page, stop searching
        }
      }

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  await browser.close();
  console.log('\n✅ Exploration complete');
}

exploreZainPaths();
