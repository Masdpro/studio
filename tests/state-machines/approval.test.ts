/** Vendor / agent account approval: pending → approved / rejected, rejected → pending on re-upload. Written before the refactor. */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, vendors, verificationDocuments } from '@/db/schema';
import { PATCH as review } from '@/app/api/admin/verifications/[userId]/route';
import { startTradingRole } from '@/lib/verification';
import { POST as uploadDocument } from '@/app/api/account/documents/route';
import { jsonRequest, makeUser, makeVendor, params, signInAs } from '../helpers';

const approvalOf = (id: string) => db.select({ s: users.approvalStatus }).from(users).where(eq(users.id, id)).get()?.s;
// Approval is stored per role (here: the vendor role); the account status is the summary.
const setApproval = (id: string, s: 'pending' | 'approved' | 'rejected') => {
  db.update(vendors).set({ approvalStatus: s }).where(eq(vendors.id, id)).run();
  db.update(users).set({ approvalStatus: s }).where(eq(users.id, id)).run();
};
const addDocs = (id: string) => {
  for (const kind of ['business_proof', 'store_photo'] as const) {
    db.insert(verificationDocuments).values({ id: randomUUID(), userId: id, kind, fileName: `${kind}.jpg`, contentType: 'image/jpeg', createdAt: new Date() }).run();
  }
};
async function act(userId: string, body: Record<string, unknown>) {
  signInAs(makeUser({ role: 'admin' }));
  return review(jsonRequest('PATCH', body), params({ userId }));
}

describe('account approval', () => {
  it('(new trading role) → pending', () => {
    const id = makeUser();
    startTradingRole(id, '08031234567', false);
    expect(approvalOf(id)).toBe('pending');
  });
  it('pending → approved when complete', async () => {
    const v = makeVendor();
    setApproval(v, 'pending');
    addDocs(v);
    expect((await act(v, { action: 'approve' })).status).toBe(200);
    expect(approvalOf(v)).toBe('approved');
  });
  it('pending stays pending when documents are missing', async () => {
    const v = makeVendor();
    setApproval(v, 'pending');
    expect((await act(v, { action: 'approve' })).status).toBe(409);
    expect(approvalOf(v)).toBe('pending');
  });
  it('pending → rejected with a reason', async () => {
    const v = makeVendor();
    setApproval(v, 'pending');
    expect((await act(v, { action: 'reject', note: 'Photo is blurry' })).status).toBe(200);
    expect(approvalOf(v)).toBe('rejected');
  });
  it('reject needs a reason', async () => {
    const v = makeVendor();
    setApproval(v, 'pending');
    expect((await act(v, { action: 'reject', note: 'no' })).status).toBe(400);
    expect(approvalOf(v)).toBe('pending');
  });
  it('approved → rejected (an admin withdraws approval)', async () => {
    const v = makeVendor();
    addDocs(v);
    expect((await act(v, { action: 'reject', note: 'Complaint received' })).status).toBe(200);
    expect(approvalOf(v)).toBe('rejected');
  });
  it('rejected → approved when complete', async () => {
    const v = makeVendor();
    setApproval(v, 'rejected');
    addDocs(v);
    expect((await act(v, { action: 'approve' })).status).toBe(200);
    expect(approvalOf(v)).toBe('approved');
  });
  it('an existing trader keeps the role they already have approved', () => {
    const v = makeVendor();
    startTradingRole(v, '08031234567', true);
    expect(approvalOf(v)).toBe('approved');
  });
  it('rejected → pending when the user uploads a document again', async () => {
    const v = makeVendor();
    setApproval(v, 'rejected');
    signInAs(v);
    // Smallest valid PNG (1×1 pixel).
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.set('kind', 'store_photo');
    form.set('file', new File([png], 'shop.png', { type: 'image/png' }));
    const res = await uploadDocument(new Request('http://test.local/api', { method: 'POST', body: form }));
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(201);
    expect(approvalOf(v)).toBe('pending');
  });
});

describe('account approval: rules added with the state machine', () => {
  it('approving an already approved account changes nothing', async () => {
    const v = makeVendor();
    addDocs(v);
    expect((await act(v, { action: 'approve' })).status).toBe(200);
    expect(approvalOf(v)).toBe('approved');
  });
  it('rejected → rejected updates the reason', async () => {
    const v = makeVendor();
    setApproval(v, 'rejected');
    expect((await act(v, { action: 'reject', note: 'New reason here' })).status).toBe(200);
    expect(db.select({ n: users.approvalNote }).from(users).where(eq(users.id, v)).get()?.n).toBe('New reason here');
  });
});
