import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://eshop.bh.zain.com', { waitUntil: 'networkidle2' });
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.includes('bh.zain.com'));
  });
  console.log(Array.from(new Set(links)).join('\n'));
  await browser.close();
})();
