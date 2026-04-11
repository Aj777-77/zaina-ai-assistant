import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.goto('https://eshop.bh.zain.com', { waitUntil: 'networkidle2' });
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: a.innerText.trim() }))
      .filter(l => l.text.toLowerCase().includes('plan') || l.href.toLowerCase().includes('plan'));
  });
  console.log(links);
  
  await browser.close();
})();
