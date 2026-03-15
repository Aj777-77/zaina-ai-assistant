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

### `zain-scraper.ts`
**Zain Bahrain e-shop scraper (eshop.bh.zain.com)**:
- `ZainBahrainScraper` class - Specialized scraper for Zain Bahrain
- `scrapeMainPage()` - Scrape products from main page
- `scrapeByCategory()` - Scrape specific categories
- `searchProducts()` - Search for products
- `getCategories()` - Get available product categories
- Anti-detection measures (custom headers, realistic user agent)
- Extracts: brand, name, price, monthly/cash prices, savings, images, URLs

## Usage Examples

### Zain Bahrain Scraper (Recommended)
```typescript
import { ZainBahrainScraper, scrapeZainBahrain } from '@/scraper/zain-scraper';

// Quick scrape
const products = await scrapeZainBahrain();
console.log(`Found ${products.length} products`);

// Advanced usage with class
const scraper = new ZainBahrainScraper();
await scraper.initialize();

// Get all products
const allProducts = await scraper.scrapeMainPage();

// Get categories
const categories = await scraper.getCategories();

// Search for specific products
const searchResults = await scraper.searchProducts('iPhone');

await scraper.close();
```

### Generic Telecom Scraper
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

Run the test suites:
```bash
# Test generic Puppeteer functionality
npm run test:puppeteer

# Test Zain Bahrain scraper
npm run test:zain
```

## Next Steps

1. Identify target telecom websites
2. Analyze their HTML structure
3. Create custom selector configurations
4. Set up scheduled scraping jobs
5. Integrate with OpenAI for product analysis
6. Store results in Firebase Firestore
