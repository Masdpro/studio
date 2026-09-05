import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';
import type { Vendor } from '@/lib/types';
import { sampleVendors } from '@/lib/mockData';

const COLLECTION = 'vendors';
const hasFirebase = () => isFirebaseConfigured && !!db;

export async function getVendors(): Promise<Vendor[]> {
  if (!hasFirebase()) return sampleVendors;
  const snap = await getDocs(collection(db!, COLLECTION));
  if (snap.empty) return sampleVendors;
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  if (!hasFirebase()) return sampleVendors.find((v) => v.id === vendorId);
  const snap = await getDoc(doc(db!, COLLECTION, vendorId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Vendor) : undefined;
}

export async function getVendorsByLocationTag(locationTag: string): Promise<Vendor[]> {
  if (!hasFirebase()) return sampleVendors.filter((v) => v.locationTag === locationTag);
  const q = query(collection(db!, COLLECTION), where('locationTag', '==', locationTag));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
}

/** Creates/updates a vendor profile. `vendorId` should match the Firebase Auth uid. */
export async function upsertVendor(vendorId: string, data: Partial<Vendor>): Promise<void> {
  const ref = doc(db!, COLLECTION, vendorId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, data as any);
  } else {
    await setDoc(ref, { id: vendorId, profileManaged: true, ...data });
  }
}
