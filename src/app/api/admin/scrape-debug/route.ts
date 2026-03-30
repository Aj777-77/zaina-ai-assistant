import { NextRequest, NextResponse } from 'next/server';
import { getBrowser } from '@/scraper/browser';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  const browser = await getBrowser({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll to trigger lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));

  const finalUrl = page.url();
  const pageTitle = await page.title();

  const info = await page.evaluate(() => {
    const cardWrappers = Array.from(document.querySelectorAll('div.card-wrapper'));

    // Dump the inner HTML of the first 2 card-wrappers so we can see their structure
    const cardSamples = cardWrappers.slice(0, 2).map(card => ({
      outerHTML: card.outerHTML.slice(0, 800),
      hasBrand: !!card.querySelector('.card-body .paragraph-p-3'),
      hasName: !!card.querySelector('.card-body .weight-700'),
      hasImg: !!card.querySelector('img.item-image'),
      hasLink: !!card.querySelector('a.text-hover-card, a[href*="/product/"]'),
      brandText: card.querySelector('.card-body .paragraph-p-3')?.textContent?.trim(),
      nameText: card.querySelector('.card-body .weight-700')?.textContent?.trim(),
    }));

    // Get all buttons text on the page
    const buttons = Array.from(document.querySelectorAll('button, a'))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length < 50)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 30);

    return { totalCardWrappers: cardWrappers.length, cardSamples, buttons };
  });

  (info as Record<string, unknown>).finalUrl = finalUrl;
  (info as Record<string, unknown>).pageTitle = pageTitle;

  await browser.close();

  return NextResponse.json(info);
}
