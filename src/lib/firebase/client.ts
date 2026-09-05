'use client';

// Firebase client SDK — used from browser code (React components/hooks).
// Reads config from NEXT_PUBLIC_* env vars, see .env.example.
//
// Firebase isn't configured until real project keys are supplied, so every
// export here is nullable — callers (AuthContext, services/*) check
// `isFirebaseConfigured` / null before using them. This keeps `next build`
// and local prototyping working before a Firebase project exists.

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);

  // Optional local dev loop against the Firebase emulator suite.
  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
    typeof window !== 'undefined' &&
    !(globalThis as any).__FIREBASE_EMULATORS_CONNECTED__
  ) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    (globalThis as any).__FIREBASE_EMULATORS_CONNECTED__ = true;
  }
}
