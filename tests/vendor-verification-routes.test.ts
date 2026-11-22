/**
 * Shops can be verified two ways: with CAC papers and a shop photo ("Registered business"), or,
 * for the many sellers with no CAC registration or no shop, with a government ID and the live selfie.
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { verificationDocuments } from '@/db/schema';
import { PATCH as review } from '@/app/api/admin/verifications/[userId]/route';
import { GET as catalog } from '@/app/api/mobile/catalog/route';
import { getVerificationState, registeredVendorIds, requiredDocumentsFor } from '@/lib/verification';
import { jsonRequest, makeUser, makeVendor, params, signInAs } from './helpers';

const addDocs = (userId: string, kinds: ('business_proof' | 'store_photo' | 'government_id' | 'selfie')[]) => {
  for (const kind of kinds) {
    db.insert(verificationDocuments).values({ id: randomUUID(), userId, kind, fileName: `${kind}.jpg`, contentType: 'image/jpeg', createdAt: new Date() }).run();
  }
};
const vendorState = (userId: string) => getVerificationState(userId)!.tradingRoles.find((r) => r.role === 'vendor')!;
async function approve(userId: string) {
  signInAs(makeUser({ role: 'admin' }));
  return review(jsonRequest('PATCH', { action: 'approve', role: 'vendor' }), params({ userId }));
}

describe('shop verification without CAC', () => {
  it('offers both routes, and a shop may upload documents for either', () => {
    const v = makeVendor('pending');
    const s = vendorState(v);
    expect(s.routes.map((r) => r.id).sort()).toEqual(['individual', 'registered']);
    expect(requiredDocumentsFor(v).sort()).toEqual(['business_proof', 'government_id', 'selfie', 'store_photo']);
    expect(s.documentsComplete).toBe(false);
  });

  it('an ID and the live selfie are enough to be approved, with no CAC and no shop photo', async () => {
    const v = makeVendor('pending');
    addDocs(v, ['government_id', 'selfie']);
    expect(vendorState(v)).toMatchObject({ route: 'individual', documentsComplete: true, registered: false });
    expect((await approve(v)).status).toBe(200);
    expect(vendorState(v).approvalStatus).toBe('approved');
    expect(registeredVendorIds().has(v)).toBe(false);
  });

  it('half of one route is not enough', async () => {
    const v = makeVendor('pending');
    addDocs(v, ['government_id', 'store_photo']);
    expect(vendorState(v).documentsComplete).toBe(false);
    expect((await approve(v)).status).toBe(409);
  });

  it('shops verified with CAC papers get the Registered business badge once approved', async () => {
    const v = makeVendor('pending');
    addDocs(v, ['business_proof', 'store_photo']);
    expect(vendorState(v)).toMatchObject({ route: 'registered', documentsComplete: true, registered: true });
    expect(registeredVendorIds().has(v)).toBe(false); // not until approved
    expect((await approve(v)).status).toBe(200);
    expect(registeredVendorIds().has(v)).toBe(true);

    const body = await (await catalog(new Request('http://x/api/mobile/catalog?side=shop'))).json();
    expect(body.vendors.find((x: { id: string }) => x.id === v)?.registered).toBe(true);
    const page = await (await catalog(new Request(`http://x/api/mobile/catalog?vendor=${v}`))).json();
    expect(page.vendor.registered).toBe(true);
  });
});
