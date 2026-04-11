import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      ]
    });
    const page = await browser.newPage();
    await page.goto("https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10", { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 10000));
    console.log(await page.content());
    await browser.close();
})();
