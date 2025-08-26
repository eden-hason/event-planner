#!/usr/bin/env tsx

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

// Sample data
const sampleUsers = [
  {
    uid: 'user1',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    photoURL: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
  },
  {
    uid: 'user2',
    email: 'jane.smith@example.com',
    displayName: 'Jane Smith',
    photoURL: 'https://ui-avatars.com/api/?name=Jane+Smith&background=random',
  },
  {
    uid: 'user3',
    email: 'mike.wilson@example.com',
    displayName: 'Mike Wilson',
    photoURL: 'https://ui-avatars.com/api/?name=Mike+Wilson&background=random',
  },
];

const sampleEvents = [
  {
    id: 'event1',
    title: 'Summer Wedding Reception',
    description:
      'A beautiful outdoor wedding reception with live music and gourmet catering',
    date: Timestamp.fromDate(new Date('2024-08-15T18:00:00Z')),
    location: 'Sunset Gardens, 123 Park Avenue',
    maxGuests: 150,
  },
  {
    id: 'event2',
    title: 'Corporate Annual Meeting',
    description: 'Annual shareholder meeting with presentations and networking',
    date: Timestamp.fromDate(new Date('2024-09-20T14:00:00Z')),
    location: 'Grand Hotel Conference Center',
    maxGuests: 200,
  },
  {
    id: 'event3',
    title: 'Birthday Party',
    description: '30th birthday celebration with friends and family',
    date: Timestamp.fromDate(new Date('2024-07-10T19:00:00Z')),
    location: 'Home - 456 Oak Street',
    maxGuests: 50,
  },
];

const sampleGuests = [
  // Event 1 - Wedding Reception
  {
    name: 'Alice Johnson',
    phone: '+1-555-0101',
    group: 'Bride Family',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: 'Vegetarian',
    amount: 2,
    notes: 'Will arrive early to help with setup',
  },
  {
    name: 'Carol Williams',
    phone: '+1-555-0102',
    group: 'Groom Family',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: '',
    amount: 1,
    notes: 'Allergic to nuts',
  },
  {
    name: 'David Brown',
    phone: '+1-555-0103',
    group: 'Friends',
    rsvpStatus: 'pending' as const,
    dietaryRestrictions: '',
    amount: 2,
    notes: '',
  },
  {
    name: 'Frank Miller',
    phone: '+1-555-0104',
    group: 'Colleagues',
    rsvpStatus: 'declined' as const,
    dietaryRestrictions: '',
    amount: 1,
    notes: 'Out of town on business',
  },
  {
    name: 'Grace Davis',
    phone: '+1-555-0105',
    group: 'Bride Family',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: 'Gluten-free',
    amount: 2,
    notes: 'Will bring a gift',
  },

  // Event 2 - Corporate Meeting
  {
    name: 'Sarah Thompson',
    phone: '+1-555-0201',
    group: 'Executive Team',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: '',
    amount: 1,
    notes: 'Will present Q3 results',
  },
  {
    name: 'Tom Anderson',
    phone: '+1-555-0202',
    group: 'Board Members',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: 'Low sodium',
    amount: 1,
    notes: '',
  },
  {
    name: 'Lisa Garcia',
    phone: '+1-555-0203',
    group: 'Department Heads',
    rsvpStatus: 'pending' as const,
    dietaryRestrictions: '',
    amount: 1,
    notes: 'May need to leave early',
  },
  {
    name: 'Robert Chen',
    phone: '+1-555-0204',
    group: 'Investors',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: 'Vegan',
    amount: 1,
    notes: 'Interested in discussing expansion plans',
  },

  // Event 3 - Birthday Party
  {
    name: 'Amanda Lee',
    phone: '+1-555-0301',
    group: 'Close Friends',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: '',
    amount: 2,
    notes: 'Bringing a cake!',
  },
  {
    name: 'Kevin Rodriguez',
    phone: '+1-555-0302',
    group: 'Work Friends',
    rsvpStatus: 'confirmed' as const,
    dietaryRestrictions: 'Lactose intolerant',
    amount: 1,
    notes: '',
  },
  {
    name: 'Maria Gonzalez',
    phone: '+1-555-0303',
    group: 'Family',
    rsvpStatus: 'pending' as const,
    dietaryRestrictions: '',
    amount: 2,
    notes: 'Will confirm by end of week',
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create users in Auth
    console.log('Creating users...');
    for (const user of sampleUsers) {
      try {
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        console.log(`✅ Created user: ${user.displayName}`);
      } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`⚠️  User already exists: ${user.displayName}`);
        } else {
          console.error(
            `❌ Error creating user ${user.displayName}:`,
            error.message,
          );
        }
      }
    }

    // Create events and guests for each user
    for (const user of sampleUsers) {
      console.log(`\nCreating events for user: ${user.displayName}`);

      // Create events
      for (const event of sampleEvents) {
        const now = Timestamp.now();
        const eventData = {
          ...event,
          createdAt: now,
          updatedAt: now,
        };

        const eventRef = firestore
          .collection('users')
          .doc(user.uid)
          .collection('events')
          .doc(event.id);

        await eventRef.set(eventData);
        console.log(`✅ Created event: ${event.title}`);

        // Create guests for this event
        console.log(`Creating guests for event: ${event.title}`);
        const guestsForEvent = sampleGuests.slice(0, 4); // Limit guests per event for variety

        for (const guest of guestsForEvent) {
          const guestRef = eventRef.collection('guests').doc();
          const now = Timestamp.now();
          const guestData = {
            ...guest,
            createdAt: now,
            updatedAt: now,
          };

          await guestRef.set(guestData);
          console.log(`  ✅ Created guest: ${guest.name}`);
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${sampleUsers.length} users`);
    console.log(
      `- Created ${sampleUsers.length * sampleEvents.length} events (${
        sampleEvents.length
      } per user)`,
    );
    console.log(
      `- Created ${
        sampleUsers.length * sampleEvents.length * 4
      } guests (4 per event)`,
    );

    console.log('\n🔗 You can now access the emulator at:');
    console.log('- Firestore: http://localhost:8080');
    console.log('- Auth: http://localhost:9099');
    console.log('- UI: http://localhost:4000');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('\n✨ Seed script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
