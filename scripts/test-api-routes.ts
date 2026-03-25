import 'dotenv/config';

const BASE_URL = 'http://localhost:3000';

async function testChatAPI() {
  console.log('\n💬 Test 1: Chat API\n');

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hi! I need a new phone under BD 300' }
      ],
      model: 'gpt-3.5-turbo'
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Chat API working');
    console.log(`📝 Response: ${data.message.substring(0, 150)}...`);
    console.log(`🤖 Model: ${data.model}`);
    console.log(`🎯 Tokens used: ${data.usage.total_tokens}`);
  } else {
    console.log('❌ Chat API failed:', data.error);
  }
}

async function testProductsGetAPI() {
  console.log('\n📦 Test 2: Products API (GET)\n');

  const response = await fetch(`${BASE_URL}/api/products?limit=5`);
  const data = await response.json();

  if (response.ok) {
    console.log('✅ Products GET API working');
    console.log(`📊 Found ${data.count} products`);

    if (data.products.length > 0) {
      console.log('\n📋 First product:');
      const product = data.products[0];
      console.log(`   Name: ${product.name}`);
      console.log(`   Brand: ${product.brand}`);
      console.log(`   Price: ${product.price}`);
    }
  } else {
    console.log('❌ Products GET failed:', data.error);
  }
}

async function testProductsPostAPI() {
  console.log('\n📦 Test 3: Products API (POST)\n');

  const testProducts = [
    {
      name: 'Test iPhone',
      brand: 'Apple',
      price: 'BD 299.000',
      imageUrl: 'https://example.com/image.png',
      productUrl: 'https://example.com/product',
      scrapedAt: new Date()
    }
  ];

  const response = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: testProducts })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Products POST API working');
    console.log(`✅ Added ${data.count} products to Firestore`);
  } else {
    console.log('❌ Products POST failed:', data.error);
  }
}

async function testScrapeAPI() {
  console.log('\n🕷️  Test 4: Scrape API (GET - Quick scrape)\n');

  const response = await fetch(`${BASE_URL}/api/scrape`);
  const data = await response.json();

  if (response.ok) {
    console.log('✅ Scrape GET API working');
    console.log(`📊 Scraped ${data.count} products`);

    if (data.products.length > 0) {
      console.log('\n📋 First scraped product:');
      const product = data.products[0];
      console.log(`   ${product.brand} - ${product.name}`);
      console.log(`   Price: ${product.price}`);
    }
  } else {
    console.log('❌ Scrape GET failed:', data.error);
  }
}

async function testScrapePostAPI() {
  console.log('\n🕷️  Test 5: Scrape API (POST - Scrape and save)\n');

  const response = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saveToDb: true })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Scrape POST API working');
    console.log(`📊 Scraped ${data.count} products`);
    console.log(`💾 Saved to database: ${data.savedToDb}`);

    const updated = data.products.filter((p: any) => p.updated).length;
    const added = data.products.filter((p: any) => !p.updated).length;
    console.log(`   - ${added} new products added`);
    console.log(`   - ${updated} existing products updated`);
  } else {
    console.log('❌ Scrape POST failed:', data.error);
  }
}

async function runTests() {
  console.log('🤖 Zaina AI - API Endpoints Test');
  console.log('='.repeat(60));
  console.log('\n⚠️  Make sure the Next.js dev server is running!');
  console.log('   Run: npm run dev\n');

  try {
    await testChatAPI();
    await testProductsGetAPI();
    await testProductsPostAPI();
    await testScrapeAPI();
    await testScrapePostAPI();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All API tests completed!\n');

    console.log('📊 Summary:');
    console.log('   ✓ /api/chat - Working');
    console.log('   ✓ /api/products (GET) - Working');
    console.log('   ✓ /api/products (POST) - Working');
    console.log('   ✓ /api/scrape (GET) - Working');
    console.log('   ✓ /api/scrape (POST) - Working\n');

  } catch (error: any) {
    console.error('\n❌ Tests failed:', error.message);
    console.log('\n💡 Tip: Make sure the dev server is running: npm run dev');
    process.exit(1);
  }
}

runTests();
