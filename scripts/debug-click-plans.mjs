import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.goto('https://eshop.bh.zain.com/product/plans?service_type=13&service_plan_type=14&contract_type=10', { waitUntil: 'networkidle2' });
  const url = await page.url();
  console.log("Navigated to:", url);
  
  const text = await page.content();
  console.log("Content length:", text.length);
  
  await browser.close();
})();
