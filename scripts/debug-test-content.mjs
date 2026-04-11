import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://eshop.bh.zain.com', { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log(html);
  await browser.close();
})();
