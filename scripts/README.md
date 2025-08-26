# Firebase Emulator Seed Script

This directory contains scripts to seed the Firebase Firestore emulator with sample data for development and testing.

## Files

- `seed.ts` - Main seed script that populates the emulator with sample data
- `seed-config.ts` - Configuration file with sample data and settings
- `README.md` - This documentation file

## Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Make sure Firebase CLI is installed:
   ```bash
   npm install -g firebase-tools
   ```

## Usage

### 1. Start the Firebase Emulators

First, start the Firebase emulators:

```bash
npm run emulators
```

This will start:

- Firestore emulator on `http://localhost:8080`
- Auth emulator on `http://localhost:9099`
- Emulator UI on `http://localhost:4000`

### 2. Run the Seed Script

In a new terminal, run the seed script:

```bash
npm run seed
```

Or for development with environment variables:

```bash
npm run seed:dev
```

### 3. Verify the Data

After running the seed script, you can:

1. Check the Emulator UI at `http://localhost:4000`
2. Navigate to the Firestore tab to see the created collections
3. Navigate to the Auth tab to see the created users

## What Gets Created

The seed script creates:

### Users (3 total)

- John Doe (`user1`)
- Jane Smith (`user2`)
- Mike Wilson (`user3`)

### Events (3 per user = 9 total)

Each user gets the same 3 events:

1. **Summer Wedding Reception** - Outdoor wedding with 150 max guests
2. **Corporate Annual Meeting** - Business meeting with 200 max guests
3. **Birthday Party** - Personal celebration with 50 max guests

### Guests (4 per event = 36 total)

Each event gets 4 sample guests with:

- Various RSVP statuses (confirmed, pending, declined)
- Different groups (Bride Family, Friends, Colleagues, etc.)
- Dietary restrictions
- Plus ones
- Notes

## Data Structure

The data follows this Firestore structure:

```
users/{userId}/
├── events/{eventId}/
│   ├── title: string
│   ├── description: string
│   ├── date: Timestamp
│   ├── location: string
│   ├── maxGuests: number
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp
│   └── guests/{guestId}/
│       ├── name: string
│       ├── email: string
│       ├── phone: string
│       ├── group: string
│       ├── rsvpStatus: 'confirmed' | 'pending' | 'declined'
│       ├── dietaryRestrictions?: string
│       ├── plusOne: boolean
│       ├── plusOneName?: string
│       ├── notes?: string
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
```

## Customization

You can customize the seed data by modifying `seed-config.ts`:

- **Event Types**: Add new event types in `EVENT_TYPES`
- **Guest Names**: Modify `GUEST_NAMES` array
- **Email Domains**: Add new domains in `EMAIL_DOMAINS`
- **Dietary Restrictions**: Update `DIETARY_RESTRICTIONS`
- **Sample Data Config**: Adjust counts and options in `SAMPLE_DATA_CONFIG`

## Troubleshooting

### Common Issues

1. **Emulator not running**: Make sure to start emulators first with `npm run emulators`

2. **Port conflicts**: If ports 8080, 9099, or 4000 are in use, the emulators will fail to start

3. **Permission errors**: Make sure the script has execute permissions:

   ```bash
   chmod +x scripts/seed.ts
   ```

4. **TypeScript errors**: Make sure all dependencies are installed:
   ```bash
   npm install
   ```

### Reset Data

To reset the emulator data:

1. Stop the emulators (Ctrl+C)
2. Delete the emulator data:
   ```bash
   firebase emulators:start --only firestore --import=./emulator-data --export-on-exit=./emulator-data
   ```
3. Restart emulators and run seed script again

## Development

### Adding New Data Types

To add new data types:

1. Update the interfaces in `lib/dal.ts`
2. Add sample data in `seed-config.ts`
3. Modify the seed script in `seed.ts`
4. Update this README

### Testing

The seed script includes error handling and will:

- Skip existing users (won't fail if users already exist)
- Log all operations with emojis for easy reading
- Provide a summary of created data
- Exit with appropriate error codes

## Environment Variables

The seed script uses the same Firebase configuration as your main application:

- **For Emulator**: No credentials needed - uses the same config as `firebase/server.ts`
- **For Production**: Uses the same environment variables as your main app:
  - `FIREBASE_TYPE`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_PRIVATE_KEY_ID`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_CLIENT_ID`
  - `FIREBASE_AUTH_URI`
  - `FIREBASE_TOKEN_URI`
  - `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
  - `FIREBASE_CLIENT_X509_CERT_URL`
  - `FIREBASE_UNIVERSE_DOMAIN`

The script imports from `../firebase/server.ts` to ensure consistency with your main application configuration.
