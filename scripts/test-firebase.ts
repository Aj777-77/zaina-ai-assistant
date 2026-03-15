/**
 * Firebase Connection Test Script
 *
 * This script tests the Firebase Admin SDK connection
 * Run with: npx tsx scripts/test-firebase.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testFirebaseConnection() {
  console.log('🔍 Testing Firebase Connection...\n');

  // Check environment variables
  console.log('📋 Checking environment variables...');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase credentials!');
    console.error('Please ensure .env.local contains:');
    console.error('  - FIREBASE_PROJECT_ID');
    console.error('  - FIREBASE_CLIENT_EMAIL');
    console.error('  - FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Client Email: ${clientEmail}`);
  console.log('');

  try {
    // Import Firebase utilities
    const { initializeFirebase } = await import('../src/lib/firebase');

    // Initialize Firebase
    console.log('🔥 Initializing Firebase Admin SDK...');
    const { db } = initializeFirebase();
    console.log('✅ Firebase initialized successfully\n');

    // Test Firestore connection
    console.log('📡 Testing Firestore connection...');

    // Try to list collections (this will verify we can connect)
    const collections = await db.listCollections();
    console.log('✅ Successfully connected to Firestore');

    if (collections.length > 0) {
      console.log(`📚 Found ${collections.length} collection(s):`);
      collections.forEach((collection) => {
        console.log(`   - ${collection.id}`);
      });
    } else {
      console.log('📚 No collections found (database is empty)');
    }
    console.log('');

    // Test writing data
    console.log('✍️  Testing write operation...');
    const testRef = db.collection('_connection_test').doc('test');
    await testRef.set({
      message: 'Connection test successful',
      timestamp: new Date().toISOString(),
      from: 'Zaina AI Assistant',
    });
    console.log('✅ Write operation successful\n');

    // Test reading data
    console.log('📖 Testing read operation...');
    const testDoc = await testRef.get();
    if (testDoc.exists) {
      console.log('✅ Read operation successful');
      console.log('   Data:', testDoc.data());
    }
    console.log('');

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await testRef.delete();
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All Firebase tests passed!');
    console.log('✅ Your Firebase connection is working correctly\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase connection test failed!\n');
    console.error('Error details:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Verify your Firebase credentials in .env.local');
    console.error('   2. Ensure the private key includes \\n characters');
    console.error('   3. Check that your service account has Firestore permissions');
    console.error('   4. Verify the project ID matches your Firebase project');
    process.exit(1);
  }
}

// Run the test
testFirebaseConnection();
