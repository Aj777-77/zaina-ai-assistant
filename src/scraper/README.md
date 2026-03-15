# Web Scraper Module

## Overview
This module provides web scraping functionality for telecom e-commerce websites using Puppeteer. It can extract product information including phones, plans, and accessories from various telecom providers.

## Files

### `browser.ts`
Core browser management utilities:
- `getBrowser()` - Initialize and reuse browser instance
- `createPage()` - Create new page with optimized settings
- `navigateToUrl()` - Navigate with retry logic
- `extractText()` - Extract text content from selectors
- `extractMultiple()` - Extract multiple elements
- `takeScreenshot()` - Debug helper for screenshots

### `telecom-scraper.ts`
Telecom-specific scraping logic:
- `TelecomScraper` class for structured scraping
- `scrapePhones()` - Extract phone products
- `scrapePlans()` - Extract plan products
- `searchProduct()` - Search functionality

## Usage Examples

### Basic Scraping
```typescript
import { TelecomScraper } from '@/scraper/telecom-scraper';

const scraper = new TelecomScraper();
await scraper.initialize();

const phones = await scraper.scrapePhones(
  'https://example-telecom.com/phones',
  {
    container: '.product-card',
    name: '.product-title',
    price: '.product-price',
    description: '.product-desc'
  }
);

await scraper.close();
```

## Testing

Run the test suite:
```bash
npm run test:puppeteer
```

## Next Steps

1. Identify target telecom websites
2. Analyze their HTML structure
3. Create custom selector configurations
4. Set up scheduled scraping jobs
5. Integrate with OpenAI for product analysis
6. Store results in Firebase Firestore
