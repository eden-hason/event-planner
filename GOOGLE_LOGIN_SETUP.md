# Google Login Setup Guide

This guide will help you set up Google authentication for your event planner app.

## Prerequisites

1. A Firebase project with Authentication enabled
2. Google Sign-In provider enabled in Firebase Console

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration
# Get these values from your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Environment
NEXT_PUBLIC_APP_ENV=development

# Emulator paths (for local development)
NEXT_PUBLIC_EMULATOR_AUTH_PATH=localhost:9099
NEXT_PUBLIC_EMULATOR_FIRESTORE_PATH=localhost:8080
```

## Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication > Sign-in method
4. Enable Google provider
5. Add your authorized domains (localhost for development)
6. Configure OAuth consent screen if needed

## Implementation Details

The Google login implementation includes:

- **Client-side Firebase config** (`firebase/client.ts`): Handles Firebase initialization and Google provider setup
- **Server-side auth actions** (`app/actions/auth.ts`): Manages session cookies and user verification
- **Google Login Button** (`components/google-login-button.tsx`): UI component for Google authentication
- **Updated Login Form** (`components/login-form.tsx`): Integrates the Google login button

## How it Works

1. User clicks "Continue with Google" button
2. Firebase opens Google OAuth popup
3. User authenticates with Google
4. Firebase returns user credentials
5. Client sends ID token to server
6. Server creates session cookie
7. User is redirected to home page

## Security Features

- Session cookies are HTTP-only and secure
- Server-side token verification
- Automatic session management
- CSRF protection through same-site cookies

## Testing

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. Click "Continue with Google"
4. Complete Google authentication
5. Verify you're redirected to the home page

## Troubleshooting

- Ensure all environment variables are set correctly
- Check Firebase Console for proper Google provider configuration
- Verify authorized domains include your development URL
- Check browser console for any authentication errors
