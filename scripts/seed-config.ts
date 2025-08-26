// Configuration for the Firebase Emulator seed script

export const EMULATOR_CONFIG = {
  projectId: 'event-planner-9cb4c',
  firestoreHost: 'localhost:8080',
  authHost: 'localhost:9099',
  // Note: No credentials needed for emulator - uses application default
  // or environment variables if available
};

// Sample data configuration
export const SAMPLE_DATA_CONFIG = {
  users: {
    count: 3,
    includeProfileData: true,
  },
  events: {
    count: 3,
    includeGuests: true,
    guestsPerEvent: 4,
  },
  guests: {
    includeDietaryRestrictions: true,
    includeNotes: true,
    includeAmount: true,
  },
};

// Event types for variety
export const EVENT_TYPES = [
  {
    title: 'Summer Wedding Reception',
    description:
      'A beautiful outdoor wedding reception with live music and gourmet catering',
    location: 'Sunset Gardens, 123 Park Avenue',
    maxGuests: 150,
    groups: ['Bride Family', 'Groom Family', 'Friends', 'Colleagues'],
  },
  {
    title: 'Corporate Annual Meeting',
    description: 'Annual shareholder meeting with presentations and networking',
    location: 'Grand Hotel Conference Center',
    maxGuests: 200,
    groups: [
      'Executive Team',
      'Board Members',
      'Department Heads',
      'Investors',
    ],
  },
  {
    title: 'Birthday Party',
    description: '30th birthday celebration with friends and family',
    location: 'Home - 456 Oak Street',
    maxGuests: 50,
    groups: ['Close Friends', 'Work Friends', 'Family', 'Neighbors'],
  },
  {
    title: 'Conference',
    description: 'Annual tech conference with workshops and networking',
    location: 'Convention Center',
    maxGuests: 300,
    groups: ['Speakers', 'Attendees', 'Sponsors', 'Organizers'],
  },
  {
    title: 'Dinner Party',
    description: 'Intimate dinner party with close friends',
    location: 'Private Residence',
    maxGuests: 20,
    groups: ['Close Friends', 'Family', 'Colleagues'],
  },
];

// Guest name generators
export const GUEST_NAMES = [
  'Alice Johnson',
  'Bob Smith',
  'Carol Williams',
  'David Brown',
  'Emma Davis',
  'Frank Miller',
  'Grace Wilson',
  'Henry Taylor',
  'Ivy Anderson',
  'Jack Garcia',
  'Kate Martinez',
  'Liam Rodriguez',
  'Mia Thompson',
  'Noah Lee',
  'Olivia Chen',
  'Paul Kim',
  'Quinn Johnson',
  'Rachel Davis',
  'Sam Wilson',
  'Tina Brown',
  'Uma Patel',
  'Victor Singh',
  "Wendy O'Connor",
  'Xavier Lopez',
  'Yara Hassan',
  'Zoe Thompson',
];

// Email domains for variety
export const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'company.com',
  'business.org',
  'university.edu',
  'startup.io',
];

// Phone number patterns
export const PHONE_PATTERNS = [
  '+1-555-01{XX}',
  '+1-555-02{XX}',
  '+1-555-03{XX}',
  '+1-555-04{XX}',
  '+1-555-05{XX}',
  '+1-555-06{XX}',
];

// Dietary restrictions
export const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Low sodium',
  'Keto',
  'Paleo',
  'Halal',
  'Kosher',
  'Low carb',
  'Sugar-free',
];

// Common notes
export const COMMON_NOTES = [
  'Will arrive early to help with setup',
  'Allergic to nuts',
  'Bringing a gift',
  'May need to leave early',
  'Interested in discussing business',
  'Will confirm by end of week',
  'Out of town on business',
  'Special dietary requirements',
  'Parking needed',
  'Will bring dessert',
];
