import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  console.log("Navigating...");
  await page.goto('https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10', { waitUntil: 'networkidle2', timeout: 60000 });
  console.log("Waiting 5s...");
  await new Promise(r => setTimeout(r, 5000));
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('debug-plans.html', html);
  console.log("Dumped to debug-plans.html");
  await browser.close();
})();
