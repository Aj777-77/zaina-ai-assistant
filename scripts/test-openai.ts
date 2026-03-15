/**
 * OpenAI Connection Test Script
 *
 * This script tests the OpenAI API connection
 * Run with: npx tsx scripts/test-openai.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI Connection...\n');

  // Check environment variables
  console.log('📋 Checking environment variables...');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.error('❌ Missing OpenAI API key!');
    console.error('Please ensure .env.local contains:');
    console.error('  - OPENAI_API_KEY');
    console.error('\nGet your API key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('');

  try {
    // Import OpenAI utilities
    const { initializeOpenAI, createChatCompletion } = await import('../src/lib/openai');

    // Initialize OpenAI
    console.log('🤖 Initializing OpenAI client...');
    const client = initializeOpenAI();
    console.log('✅ OpenAI client initialized successfully\n');

    // Test 1: Simple chat completion
    console.log('💬 Test 1: Simple chat completion...');
    const startTime = Date.now();

    const response = await createChatCompletion(
      [
        {
          role: 'system',
          content: 'You are a helpful assistant for a telecom e-commerce platform.'
        },
        {
          role: 'user',
          content: 'Say "Hello! I am Zaina AI Assistant and I am ready to help!" in a friendly way.'
        }
      ],
      'gpt-3.5-turbo', // Using gpt-3.5-turbo for faster and cheaper testing
      0.7
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (response.choices && response.choices.length > 0) {
      console.log('✅ Chat completion successful');
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📝 Model used: ${response.model}`);
      console.log(`💭 Response: "${response.choices[0].message.content}"`);
      console.log(`🎯 Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
    } else {
      console.error('❌ No response received from OpenAI');
      process.exit(1);
    }
    console.log('');

    // Test 2: List available models
    console.log('📚 Test 2: Checking available models...');
    const models = await client.models.list();
    const modelIds = models.data.map(m => m.id).slice(0, 5);
    console.log('✅ Successfully retrieved models list');
    console.log(`   First 5 models: ${modelIds.join(', ')}`);
    console.log('');

    // Test 3: Test with a telecom-specific query
    console.log('📱 Test 3: Telecom-specific assistant test...');
    const telecomResponse = await createChatCompletion(
      [
        {
          role: 'system',
          content: 'You are Zaina, an AI shopping assistant for a telecom e-commerce platform. You help users find phones, plans, and accessories.'
        },
        {
          role: 'user',
          content: 'What can you help me with?'
        }
      ],
      'gpt-3.5-turbo',
      0.7
    );

    if (telecomResponse.choices && telecomResponse.choices.length > 0) {
      console.log('✅ Telecom assistant test successful');
      console.log(`💬 Response: "${telecomResponse.choices[0].message.content}"`);
    }
    console.log('');

    console.log('🎉 All OpenAI tests passed!');
    console.log('✅ Your OpenAI integration is working correctly\n');

    console.log('📊 Summary:');
    console.log(`   ✓ API connection successful`);
    console.log(`   ✓ Chat completions working`);
    console.log(`   ✓ Model access verified`);
    console.log(`   ✓ Telecom assistant personality tested`);
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ OpenAI connection test failed!\n');
    console.error('Error details:');

    if (error.status === 401) {
      console.error('   Invalid API key or unauthorized access');
      console.error('   Please verify your OPENAI_API_KEY in .env.local');
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded or insufficient quota');
      console.error('   Check your OpenAI account billing: https://platform.openai.com/account/billing');
    } else if (error.status === 500 || error.status === 503) {
      console.error('   OpenAI service error');
      console.error('   The service might be temporarily unavailable');
    } else if (error.message) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Verify your API key is correct in .env.local');
    console.error('   2. Check your OpenAI account has available credits');
    console.error('   3. Ensure no extra spaces or quotes around the API key');
    console.error('   4. Visit https://platform.openai.com/account/api-keys to manage keys');
    console.error('   5. Check https://status.openai.com/ for service status');
    process.exit(1);
  }
}

// Run the test
testOpenAIConnection();
