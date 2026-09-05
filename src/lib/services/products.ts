import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';
import type { Product } from '@/lib/types';
import { sampleProductsForMockOrders } from '@/lib/mockData';

const COLLECTION = 'products';
const hasFirebase = () => isFirebaseConfigured && !!db;

export async function getProducts(): Promise<Product[]> {
  if (!hasFirebase()) return sampleProductsForMockOrders;
  const snap = await getDocs(collection(db!, COLLECTION));
  if (snap.empty) return sampleProductsForMockOrders;
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProductsByVendor(vendorId: string): Promise<Product[]> {
  if (!hasFirebase()) return sampleProductsForMockOrders.filter((p) => p.vendorId === vendorId);
  const q = query(collection(db!, COLLECTION), where('vendorId', '==', vendorId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProductById(productId: string): Promise<Product | undefined> {
  if (!hasFirebase()) return sampleProductsForMockOrders.find((p) => p.id === productId);
  const snap = await getDoc(doc(db!, COLLECTION, productId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : undefined;
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db!, COLLECTION), data);
  return ref.id;
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db!, COLLECTION, productId), data as any);
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db!, COLLECTION, productId));
}
