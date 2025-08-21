import serviceAccount from './service-account.json';
import { initializeApp } from 'firebase-admin';
import { ServiceAccount, cert, getApps } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

let firestore: Firestore | undefined = undefined;

const currentApps = getApps();

if (currentApps.length <= 0) {
  if (process.env.NEXT_PUBLIC_APP_ENV === 'emulator') {
    process.env['FIREBASE_EMULATOR_HOST'] =
      process.env.NEXT_PUBLIC_EMULATOR_FIRESTORE_PATH;
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
      process.env.NEXT_PUBLIC_EMULATOR_AUTH_PATH;
  }

  const app = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
  });

  firestore = getFirestore(app);
} else {
  firestore = getFirestore(currentApps[0]);
}

export { firestore };
