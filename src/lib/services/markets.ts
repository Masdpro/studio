import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';
import type { Market } from '@/lib/types';
import { sampleMarkets } from '@/lib/mockData';

const COLLECTION = 'markets';

/**
 * Reads all markets from Firestore. Falls back to the bundled sample data
 * when Firebase isn't configured yet (e.g. NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * missing), so the UI keeps working during local prototyping.
 */
export async function getMarkets(): Promise<Market[]> {
  if (!isFirebaseConfigured || !db) return sampleMarkets;

  const snap = await getDocs(collection(db!, COLLECTION));
  if (snap.empty) return sampleMarkets;
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market));
}

export async function getMarketsByLocationTag(locationTag: string): Promise<Market[]> {
  if (!isFirebaseConfigured || !db) {
    return sampleMarkets.filter((m) => m.locationTag === locationTag);
  }

  const q = query(collection(db!, COLLECTION), where('locationTag', '==', locationTag));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market));
}
