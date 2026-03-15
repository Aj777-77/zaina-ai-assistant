import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

/**
 * Initialize Firebase Admin SDK
 * Uses environment variables for configuration
 */
export function initializeFirebase(): { app: App; db: Firestore } {
  // Check if Firebase is already initialized
  if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    return { app, db };
  }

  // Validate environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase credentials. Please check your .env.local file.\n' +
      'Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  // Initialize Firebase Admin with service account
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines with actual newlines
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });

  // Get Firestore instance
  db = getFirestore(app);

  console.log('✅ Firebase Admin initialized successfully');
  console.log(`📦 Project ID: ${projectId}`);

  return { app, db };
}

/**
 * Get Firestore database instance
 * Initializes Firebase if not already initialized
 */
export function getDb(): Firestore {
  if (!db) {
    const initialized = initializeFirebase();
    return initialized.db;
  }
  return db;
}

/**
 * Get Firebase App instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseApp(): App {
  if (!app) {
    const initialized = initializeFirebase();
    return initialized.app;
  }
  return app;
}

// Export initialized instances
export { app, db };
