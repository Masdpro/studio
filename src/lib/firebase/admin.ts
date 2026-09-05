// Firebase Admin SDK — server-only. Import this ONLY from server actions,
// route handlers (src/app/api/**), or Genkit flows — never from client components.

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add a service account JSON to .env.local (see .env.example).'
    );
  }

  const serviceAccount = JSON.parse(raw);
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminApp = getAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
