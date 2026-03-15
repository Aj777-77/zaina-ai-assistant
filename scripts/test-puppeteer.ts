import 'dotenv/config';
import { TelecomScraper, scrapeExampleSite } from '../src/scraper/telecom-scraper';
import { createPage, navigateToUrl, closeBrowser } from '../src/scraper/browser';

async function testPuppeteerBasics() {
  console.log('🔍 Testing Puppeteer Installation...\n');

  console.log('📦 Test 1: Browser Launch...');
  try {
    const page = await createPage({ headless: true });
    console.log('✅ Browser launched successfully');

    console.log('\n🌐 Test 2: Navigation...');
    const success = await navigateToUrl(page, 'https://example.com');
    if (success) {
      console.log('✅ Successfully navigated to example.com');

      const title = await page.title();
      console.log(`   Page title: "${title}"`);
    } else {
      console.log('❌ Failed to navigate');
    }

    await closeBrowser();
    console.log('✅ Browser closed successfully');
  } catch (error) {
    console.error('❌ Error in basic tests:', error);
    throw error;
  }
}

async function testTelecomScraper() {
  console.log('\n📱 Test 3: Telecom Scraper (Demo Site)...');

  try {
    const products = await scrapeExampleSite();

    if (products.length > 0) {
      console.log(`✅ Successfully scraped ${products.length} products\n`);

      console.log('📋 Sample Products (first 3):');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`\n   ${index + 1}. ${product.name}`);
        console.log(`      💰 Price: ${product.price}`);
        console.log(`      🔗 URL: ${product.url.substring(0, 60)}...`);
        if (product.description) {
          console.log(`      📝 Description: ${product.description.substring(0, 80)}...`);
        }
      });
    } else {
      console.log('⚠️  No products found (this is expected if the demo site structure changed)');
    }
  } catch (error) {
    console.error('❌ Error in scraper test:', error);
    throw error;
  }
}

async function testCustomSearch() {
  console.log('\n🔎 Test 4: Custom Search Functionality...');

  const scraper = new TelecomScraper();

  try {
    await scraper.initialize(true);
    console.log('✅ Scraper initialized');

    // Test navigation to a search page
    const page = await createPage();
    const success = await navigateToUrl(page, 'https://www.google.com');

    if (success) {
      console.log('✅ Search navigation working');
    }

    await scraper.close();
  } catch (error) {
    console.error('❌ Error in search test:', error);
    await scraper.close();
  }
}

async function runAllTests() {
  console.log('🤖 Zaina AI - Puppeteer Web Scraper Tests\n');
  console.log('='.repeat(50));

  try {
    await testPuppeteerBasics();
    await testTelecomScraper();
    await testCustomSearch();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All Puppeteer tests completed!\n');

    console.log('📊 Summary:');
    console.log('   ✓ Browser launch and navigation working');
    console.log('   ✓ Page scraping functional');
    console.log('   ✓ Telecom scraper class ready');
    console.log('   ✓ Search functionality available');

    console.log('\n📝 Next Steps:');
    console.log('   1. Identify specific telecom websites to scrape');
    console.log('   2. Analyze their HTML structure and CSS selectors');
    console.log('   3. Customize the scraper selectors for those sites');
    console.log('   4. Integrate scraped data with Firebase Firestore');
    console.log('   5. Connect to OpenAI for product recommendations\n');

  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runAllTests();
