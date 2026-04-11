import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  console.log("Loading page...");
  await page.goto('https://eshop.bh.zain.com', { waitUntil: 'networkidle2' });
  const title = await page.title();
  const html = await page.content();
  console.log("Title: " + title);
  console.log("Length: " + html.length);
  await browser.close();
})();
