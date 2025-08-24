// Firebase Configuration
// This file ensures environment variables are set before Firebase initialization

export function configureFirebaseEmulators() {
  // Always set emulator environment variables if in emulator mode
  if (process.env.NEXT_PUBLIC_APP_ENV === 'emulator') {
    // Set environment variables for Firebase Admin SDK emulator connections
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.NEXT_PUBLIC_EMULATOR_FIRESTORE_PATH || 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      process.env.NEXT_PUBLIC_EMULATOR_AUTH_PATH || 'localhost:9099';

    console.log('🔥 Firebase Emulator Configuration:');
    console.log(`  - Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`  - Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
    console.log(`  - NEXT_PUBLIC_APP_ENV: ${process.env.NEXT_PUBLIC_APP_ENV}`);
  } else {
    console.log('🚀 Firebase Production Configuration');
    console.log(`  - NEXT_PUBLIC_APP_ENV: ${process.env.NEXT_PUBLIC_APP_ENV}`);
  }
}

// Call this function before any Firebase imports
configureFirebaseEmulators();
