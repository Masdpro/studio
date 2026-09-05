import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/client';
import type { Order } from '@/lib/types';
import { masterSampleOrders } from '@/lib/mockData';

const COLLECTION = 'orders';
const hasFirebase = () => isFirebaseConfigured && !!db;

export async function getOrdersForCustomer(customerId: string): Promise<Order[]> {
  if (!hasFirebase()) return masterSampleOrders.filter((o) => o.customerId === customerId);
  const q = query(
    collection(db!, COLLECTION),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrdersForVendor(vendorId: string): Promise<Order[]> {
  if (!hasFirebase()) return masterSampleOrders.filter((o) => o.vendorId === vendorId);
  const q = query(
    collection(db!, COLLECTION),
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrdersForDeliveryAgent(agentId: string): Promise<Order[]> {
  if (!hasFirebase()) return masterSampleOrders.filter((o) => o.deliveryAgentId === agentId);
  const q = query(collection(db!, COLLECTION), where('deliveryAgentId', '==', agentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db!, COLLECTION), { ...data, createdAt: new Date() });
  return ref.id;
}

export async function updateOrderStatus(orderId: string, status: Order['status'], extra: Partial<Order> = {}): Promise<void> {
  await updateDoc(doc(db!, COLLECTION, orderId), { status, ...extra });
}

export async function getOrderById(orderId: string): Promise<Order | undefined> {
  const snap = await getDoc(doc(db!, COLLECTION, orderId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : undefined;
}
