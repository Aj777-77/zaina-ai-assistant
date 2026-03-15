# Web Scraper

This directory contains Puppeteer scripts for web scraping telecom e-commerce websites.

## Purpose

- Scrape product information from telecom websites
- Extract pricing, specifications, and availability
- Gather real-time data for the AI assistant

## Structure

- **scrapers/**: Individual scraper modules for different websites
- **utils/**: Shared scraping utilities and helpers
- **config/**: Scraper configuration and settings

## Dependencies

- Puppeteer for browser automation
- Cheerio for HTML parsing (optional)

## Usage

```typescript
import { scrapeProducts } from '@/scraper/scrapers/example-site';

const products = await scrapeProducts('search-query');
```
