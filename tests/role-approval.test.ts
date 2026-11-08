/**
 * Approval is per role: an approved vendor who becomes a delivery agent (or the other way round)
 * keeps trading in the role they already have, but the new role waits for its own admin approval.
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { deliveryAgents, users, vendors, verificationDocuments } from '@/db/schema';
import { POST as saveAgentProfile } from '@/app/api/delivery-agent/profile/route';
import { POST as saveVendorProfile } from '@/app/api/vendor/profile/route';
import { POST as createErrand } from '@/app/api/errands/route';
import { POST as submitQuote } from '@/app/api/errands/[errandId]/quotes/route';
import { PATCH as review } from '@/app/api/admin/verifications/[userId]/route';
import { GET as listForReview } from '@/app/api/admin/verifications/route';
import { getVerificationState, tradingBlockReason } from '@/lib/verification';
import { withdrawalBlockReason } from '@/lib/services/withdrawals';
import { jsonRequest, makeAgent, makeUser, makeVendor, params, signInAs } from './helpers';

const addDocs = (userId: string, kinds: ('business_proof' | 'store_photo' | 'government_id' | 'selfie')[]) => {
  for (const kind of kinds) {
    db.insert(verificationDocuments).values({ id: randomUUID(), userId, kind, fileName: `${kind}.jpg`, contentType: 'image/jpeg', createdAt: new Date() }).run();
  }
};
const roleState = (userId: string, role: string) => getVerificationState(userId)!.tradingRoles.find((r) => r.role === role)!;

async function becomeAgent(userId: string) {
  signInAs(userId);
  const res = await saveAgentProfile(jsonRequest('POST', { name: 'Ade', email: `${userId}@test.local`, phone: '08031234567', streetAddress: '1 Road', city: 'Lagos', country: 'Nigeria' }));
  expect(res.status).toBe(200);
}
async function adminReview(userId: string, body: Record<string, unknown>) {
  signInAs(makeUser({ role: 'admin' }));
  return review(jsonRequest('PATCH', body), params({ userId }));
}
async function quote(agentId: string) {
  signInAs(makeUser());
  const created = await createErrand(jsonRequest('POST', { itemsDescription: '2 loaves of bread', deliveryAddress: '3 Home St' }));
  const { id } = await created.json();
  signInAs(agentId);
  return submitQuote(jsonRequest('POST', { estimatedItemCost: 2000, deliveryFee: 500 }), params({ errandId: id }));
}

describe('approval per role', () => {
  it('an approved vendor who becomes an agent: vendor keeps trading, agent waits for approval', async () => {
    const v = makeVendor();
    addDocs(v, ['business_proof', 'store_photo']);
    await becomeAgent(v);

    expect(tradingBlockReason(v, 'vendor')).toBeNull();
    expect(tradingBlockReason(v, 'delivery_agent')).not.toBeNull();
    expect(roleState(v, 'vendor')).toMatchObject({ approvalStatus: 'approved', mayTrade: true });
    expect(roleState(v, 'delivery_agent')).toMatchObject({ approvalStatus: 'pending', mayTrade: false });
    expect((await quote(v)).status).toBe(403);

    // The vendor side still works: withdrawals of shop earnings are not frozen.
    expect(withdrawalBlockReason(v)).not.toMatch(/verification/i);
  });

  it('the new role needs its own documents before an admin can approve it', async () => {
    const v = makeVendor();
    addDocs(v, ['business_proof', 'store_photo']);
    await becomeAgent(v);

    expect((await adminReview(v, { action: 'approve', role: 'delivery_agent' })).status).toBe(409);
    addDocs(v, ['government_id', 'selfie']);
    expect((await adminReview(v, { action: 'approve', role: 'delivery_agent' })).status).toBe(200);

    expect(roleState(v, 'delivery_agent').approvalStatus).toBe('approved');
    expect((await quote(v)).status).toBe(201);
  });

  it('without a role, the admin action goes to the role that is waiting', async () => {
    const v = makeVendor();
    addDocs(v, ['business_proof', 'store_photo', 'government_id', 'selfie']);
    await becomeAgent(v);
    expect((await adminReview(v, { action: 'approve' })).status).toBe(200);
    expect(roleState(v, 'delivery_agent').approvalStatus).toBe('approved');
  });

  it('sending back the agent role leaves the vendor role approved', async () => {
    const v = makeVendor();
    addDocs(v, ['business_proof', 'store_photo']);
    await becomeAgent(v);
    expect((await adminReview(v, { action: 'reject', role: 'delivery_agent', note: 'ID photo is blurry' })).status).toBe(200);
    expect(roleState(v, 'delivery_agent')).toMatchObject({ approvalStatus: 'rejected', approvalNote: 'ID photo is blurry' });
    expect(tradingBlockReason(v, 'vendor')).toBeNull();
  });

  it('an approved agent who becomes a vendor: the shop waits for approval', async () => {
    const a = makeAgent('approved');
    signInAs(a);
    const res = await saveVendorProfile(jsonRequest('POST', { businessName: 'Ade Stores', contactEmail: `${a}@test.local`, phone: '08031234567', streetAddress: '1 Road', city: 'Lagos', country: 'Nigeria' }));
    expect(res.status).toBe(200);
    expect(tradingBlockReason(a, 'delivery_agent')).toBeNull();
    expect(tradingBlockReason(a, 'vendor')).not.toBeNull();
  });

  it('the account summary is approved only when every role is', async () => {
    const v = makeVendor();
    addDocs(v, ['business_proof', 'store_photo']);
    await becomeAgent(v);
    expect(db.select().from(users).where(eq(users.id, v)).get()?.approvalStatus).toBe('pending');
    expect(db.select().from(vendors).where(eq(vendors.id, v)).get()?.approvalStatus).toBe('approved');
    expect(db.select().from(deliveryAgents).where(eq(deliveryAgents.id, v)).get()?.approvalStatus).toBe('pending');
  });

  it('the admin review list shows each role on its own', async () => {
    const v = makeVendor();
    await becomeAgent(v);
    signInAs(makeUser({ role: 'admin' }));
    const { accounts } = await (await listForReview()).json();
    const mine = accounts.filter((a: { id: string }) => a.id === v);
    expect(mine.map((a: { reviewRole: string; approvalStatus: string }) => [a.reviewRole, a.approvalStatus]).sort()).toEqual([
      ['delivery_agent', 'pending'],
      ['vendor', 'approved'],
    ]);
  });
});
