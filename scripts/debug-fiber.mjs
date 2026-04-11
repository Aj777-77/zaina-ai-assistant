import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'] 
  });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto('https://eshop.bh.zain.com/product/plans?service_type=18&service_plan_type=19&contract_type=105', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 1000));
  
  await browser.close();
})();
