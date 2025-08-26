#!/usr/bin/env tsx

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK for emulator
// For emulator, we don't need credentials
let app;

try {
  // Check if app already exists
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    // Initialize new app for emulator
    app = initializeApp({
      projectId: 'event-planner-9cb4c',
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

const firestore = getFirestore(app);
const auth = getAuth(app);

async function checkEmulatorStatus() {
  try {
    console.log('🔍 Checking emulator status...');

    // Try to connect to Firestore
    const testDoc = firestore.collection('_test').doc('connection');
    await testDoc.set({ timestamp: new Date() });
    await testDoc.delete();

    console.log('✅ Firestore emulator is running and accessible');

    // Try to connect to Auth
    try {
      await auth.listUsers(1);
      console.log('✅ Auth emulator is running and accessible');
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        console.log(
          '✅ Auth emulator is running (operation not allowed is expected)',
        );
      } else {
        console.log('❌ Auth emulator may not be running:', error.message);
      }
    }

    return true;
  } catch (error: any) {
    console.error('❌ Emulator connection failed:', error.message);
    console.log('\n💡 Make sure to start the emulators first:');
    console.log('   npm run emulators');
    return false;
  }
}

async function clearAllData() {
  try {
    console.log('🧹 Clearing all emulator data...');

    // Clear Firestore data
    const collections = await firestore.listCollections();
    for (const collection of collections) {
      const docs = await collection.listDocuments();
      for (const doc of docs) {
        await doc.delete();
      }
      console.log(`✅ Cleared collection: ${collection.id}`);
    }

    // Clear Auth data
    const users = await auth.listUsers();
    for (const user of users.users) {
      await auth.deleteUser(user.uid);
    }
    console.log(`✅ Cleared ${users.users.length} users from Auth`);

    console.log('🎉 All emulator data cleared successfully!');
  } catch (error: any) {
    console.error('❌ Error clearing data:', error.message);
  }
}

async function getDataSummary() {
  try {
    console.log('📊 Getting data summary...');

    // Count users
    const users = await auth.listUsers();
    console.log(`👥 Users: ${users.users.length}`);

    // Count events and guests
    let totalEvents = 0;
    let totalGuests = 0;

    const collections = await firestore.listCollections();
    for (const collection of collections) {
      if (collection.id === 'users') {
        const userDocs = await collection.listDocuments();
        for (const userDoc of userDocs) {
          const eventCollections = await userDoc.listCollections();
          for (const eventCollection of eventCollections) {
            if (eventCollection.id === 'events') {
              const eventDocs = await eventCollection.listDocuments();
              totalEvents += eventDocs.length;

              for (const eventDoc of eventDocs) {
                const guestCollections = await eventDoc.listCollections();
                for (const guestCollection of guestCollections) {
                  if (guestCollection.id === 'guests') {
                    const guestDocs = await guestCollection.listDocuments();
                    totalGuests += guestDocs.length;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`📅 Events: ${totalEvents}`);
    console.log(`👤 Guests: ${totalGuests}`);

    return {
      users: users.users.length,
      events: totalEvents,
      guests: totalGuests,
    };
  } catch (error: any) {
    console.error('❌ Error getting summary:', error.message);
    return { users: 0, events: 0, guests: 0 };
  }
}

// CLI argument handling
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'status':
      await checkEmulatorStatus();
      break;
    case 'clear':
      await clearAllData();
      break;
    case 'summary':
      await getDataSummary();
      break;
    default:
      console.log('🔧 Emulator Utilities');
      console.log('\nAvailable commands:');
      console.log('  status   - Check if emulators are running');
      console.log('  clear    - Clear all emulator data');
      console.log('  summary  - Get data summary');
      console.log('\nUsage:');
      console.log('  npm run emulator:status');
      console.log('  npm run emulator:clear');
      console.log('  npm run emulator:summary');
      break;
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Utility script failed:', error);
    process.exit(1);
  });
