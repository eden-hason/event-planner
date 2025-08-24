import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDzL4c18-jZh6IwNiyWCoSrgZ-MrfnNXpA',
  authDomain: 'event-planner-9cb4c.firebaseapp.com',
  projectId: 'event-planner-9cb4c',
  storageBucket: 'event-planner-9cb4c.firebasestorage.app',
  messagingSenderId: '569231448306',
  appId: '1:569231448306:web:2c4cf2a64a614eb583586b',
};

// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators if in development mode
if (process.env.NEXT_PUBLIC_APP_ENV === 'emulator') {
  const authEmulatorHost =
    process.env.NEXT_PUBLIC_EMULATOR_AUTH_PATH || 'localhost:9099';

  connectAuthEmulator(auth, `http://${authEmulatorHost}`, {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, 'localhost', 8080);
}

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export { auth, googleProvider, db };
