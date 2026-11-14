/**
 * People can delete their own account (the app stores require it). It's refused while anything is still
 * in progress or money is left in the wallet; otherwise personal details are wiped and the account can
 * never sign in again, while past orders stay for the other side's records.
 */
import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { bankAccounts, orders, serviceProviders, users, vendors, verificationDocuments } from '@/db/schema';
import { applyEntry } from '@/lib/services/wallets';
import { suspendedVendorIds as suspendedAccountIds } from '@/lib/services/products';
import { isListedProvider } from '@/lib/services/bookings';
import { deleteAccount, deletionBlockers } from '@/lib/services/account-deletion';
import { GET as blockersApi, POST as deleteApi } from '@/app/api/account/delete/route';
import { jsonRequest, makeOrder, makeProvider, makeUser, makeVendor, signInAs } from './helpers';

const withPassword = async (id: string) => db.update(users).set({ passwordHash: await bcrypt.hash('password123', 4) }).where(eq(users.id, id)).run();
const fund = (userId: string, amount: number) => db.transaction((tx) => applyEntry(tx, { id: `t-${userId}-${amount}-${Math.random()}`, userId, type: 'funding', amount, description: 'test' }));

describe('deleting your own account', () => {
  it('wipes personal details, signs out everywhere and keeps past orders', async () => {
    const id = makeUser();
    await withPassword(id);
    const vendor = makeVendor('approved');
    makeOrder({ customerId: id, vendorId: vendor, status: 'Delivered' });
    db.update(users).set({ phone: '+2348031234567', address: '1 Home Street', displayName: 'Ada' }).where(eq(users.id, id)).run();
    db.insert(bankAccounts).values({ userId: id, bankCode: '058', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'ADA', recipientCode: 'RCP_x', createdAt: new Date(), updatedAt: new Date() }).run();
    db.insert(verificationDocuments).values({ id: `d-${id}`, userId: id, kind: 'government_id', fileName: `missing-${id}.jpg`, contentType: 'image/jpeg', createdAt: new Date() }).run();
    const before = db.select().from(users).where(eq(users.id, id)).get()!;

    signInAs(id);
    const res = await deleteApi(jsonRequest('POST', { password: 'password123' }));
    expect(res.status).toBe(200);

    const after = db.select().from(users).where(eq(users.id, id)).get()!;
    expect(after.email).toBe(`${id}@deleted.cbuyapp.com`);
    expect(after).toMatchObject({ displayName: 'Deleted account', phone: null, address: null });
    expect(after.suspendedAt).not.toBeNull();
    expect(after.sessionVersion).toBe(before.sessionVersion + 1); // every device is signed out
    expect(await bcrypt.compare('password123', after.passwordHash)).toBe(false); // can't sign in again
    expect(db.select().from(bankAccounts).where(eq(bankAccounts.userId, id)).all()).toEqual([]);
    expect(db.select().from(verificationDocuments).where(eq(verificationDocuments.userId, id)).all()).toEqual([]);
    expect(db.select().from(orders).where(eq(orders.customerId, id)).all()).toHaveLength(1); // the vendor's record stays
  });

  it('needs the right password', async () => {
    const id = makeUser();
    await withPassword(id);
    signInAs(id);
    const res = await deleteApi(jsonRequest('POST', { password: 'wrong-password' }));
    expect(res.status).toBe(400);
    expect(db.select().from(users).where(eq(users.id, id)).get()!.suspendedAt).toBeNull();
  });

  it('is refused while an order is open or money is left in the wallet', async () => {
    const id = makeUser();
    await withPassword(id);
    const vendor = makeVendor('approved');
    const orderId = makeOrder({ customerId: id, vendorId: vendor, status: 'Processing' });
    fund(id, 2500);
    signInAs(id);
    const { blockers } = await (await blockersApi()).json();
    expect(blockers.join(' ')).toMatch(/order is still in progress/);
    expect(blockers.join(' ')).toMatch(/₦2,500/);
    const res = await deleteApi(jsonRequest('POST', { password: 'password123' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reasons).toHaveLength(2);
    void orderId;
  });

  it('a store or service business disappears from Closebuy and loses its contact details', async () => {
    const vendor = makeVendor('approved');
    makeProvider('approved', vendor);
    await withPassword(vendor);
    expect(isListedProvider(vendor)).toBe(true);
    await deleteAccount(vendor, 'password123');
    expect(suspendedAccountIds().has(vendor)).toBe(true);
    expect(isListedProvider(vendor)).toBe(false);
    expect(db.select().from(vendors).where(eq(vendors.id, vendor)).get()).toMatchObject({ contactEmail: '', phone: '' });
    expect(db.select().from(serviceProviders).where(eq(serviceProviders.id, vendor)).get()).toMatchObject({ contactEmail: '', phone: '' });
    expect(deletionBlockers(vendor)).toEqual([]);
  });

  it('admin accounts cannot delete themselves here', async () => {
    const id = makeUser({ role: 'admin' });
    await withPassword(id);
    await expect(deleteAccount(id, 'password123')).rejects.toMatchObject({ code: 'NOT_ALLOWED' });
  });
});
