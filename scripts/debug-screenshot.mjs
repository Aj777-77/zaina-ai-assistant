import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.goto('https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'debug-plan.png' });
  const html = await page.content();
  console.log('HTML length:', html.length);
  fs.writeFileSync('debug-plan.html', html);
  await browser.close();
})();

