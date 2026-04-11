import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  const html = await page.evaluate(() => document.body.innerHTML);
  const fs = await import('fs');
  fs.writeFileSync('debug-plans.html', html);
  console.log("Dumped to debug-plans.html");
  await browser.close();
})();
