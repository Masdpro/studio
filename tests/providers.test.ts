/**
 * Service businesses ("providers") are separate from product stores: registered on their own, approved
 * on their own, and one login can own both. Each service can show a portfolio of past work.
 */
import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceProviders, servicePortfolio, users } from '@/db/schema';
import { getUserRoles } from '@/lib/roles';
import { getVerificationState, setRoleApproval } from '@/lib/verification';
import { createBooking, createService, deleteService, lagosMoment, saveServiceSettings } from '@/lib/services/bookings';
import { addPortfolioItem, listedProviders, PORTFOLIO_LIMIT, publicPortfolio, publicProvider, removePortfolioItem, upsertProvider } from '@/lib/services/providers';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as addProviderToAccount } from '@/app/api/provider/profile/route';
import { POST as addPhoto } from '@/app/api/provider/services/[serviceId]/portfolio/route';
import { GET as portfolioApi } from '@/app/api/services/[serviceId]/portfolio/route';
import { GET as adminVerifications } from '@/app/api/admin/verifications/route';
import { jsonRequest, makeProvider, makeUser, makeVendor, params, signInAs } from './helpers';

let ip = 0;
const post = (body: unknown) => new Request('http://test.local/api/auth/register', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'fly-client-ip': `10.7.0.${++ip}` } });
const profile = { businessName: 'Kemi Braids', category: 'beauty', streetAddress: '4 Bode Thomas Street', area: 'Surulere', city: 'Lagos', tagline: 'Knotless and cornrows' };
const photo = (n = 0) => `/api/uploads/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
const HOURS = { '0': [], '1': [['09:00', '18:00']], '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '18:00']], '6': [] } as const;

function bookableProvider(approval: 'pending' | 'approved' = 'approved', userId?: string) {
  const id = makeProvider(approval, userId);
  saveServiceSettings(id, { weeklyHours: HOURS as any });
  const svc = createService(id, { name: 'Knotless braids', price: 20000, durationMin: 120, location: 'shop' });
  return { id, svc };
}

describe('registering a service business', () => {
  it('a new account chooses services: a provider profile is created and waits for review', async () => {
    const email = `kemi-${Date.now()}@test.local`;
    const res = await register(post({ email, password: 'password123', role: 'provider', phone: '08031234567', profile }));
    expect(res.status).toBe(201);
    const user = db.select().from(users).where(eq(users.email, email)).get()!;
    expect(user.role).toBe('provider');
    expect(getUserRoles(user.id)).toEqual(['customer', 'provider']);
    const p = db.select().from(serviceProviders).where(eq(serviceProviders.id, user.id)).get()!;
    expect(p).toMatchObject({ businessName: 'Kemi Braids', category: 'beauty', approvalStatus: 'pending', slug: 'kemi-braids', area: 'Surulere' });
    // Like delivery agents, providers prove who they are (they often work in customers' homes).
    const state = getVerificationState(user.id)!;
    expect(state.tradingRoles.map((r) => [r.role, r.requiredDocuments.map((d) => d.kind)])).toEqual([['provider', ['government_id', 'selfie']]]);
  });

  it('a missing detail stops sign-up and leaves no half-made account', async () => {
    const email = `broken-${Date.now()}@test.local`;
    const res = await register(post({ email, password: 'password123', role: 'provider', phone: '08031234567', profile: { ...profile, category: 'astrology' } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/kind of service/);
    expect(db.select().from(users).where(eq(users.email, email)).get()).toBeUndefined();
  });

  it('one login can own a store and a service business; each is approved on its own', async () => {
    const vendor = makeVendor('approved');
    signInAs(vendor);
    const res = await addProviderToAccount(jsonRequest('POST', { ...profile, businessName: 'Mama Put Catering', category: 'events', phone: '08031234567' }));
    expect(res.status).toBe(201);
    expect(getUserRoles(vendor)).toEqual(['customer', 'vendor', 'provider']);
    const roles = getVerificationState(vendor)!.tradingRoles;
    expect(roles.find((r) => r.role === 'vendor')!.mayTrade).toBe(true); // the store keeps trading
    expect(roles.find((r) => r.role === 'provider')!.approvalStatus).toBe('pending');
    // Adding it twice is refused.
    expect((await addProviderToAccount(jsonRequest('POST', profile))).status).toBe(409);
  });

  it('an existing shopper adds a service business by signing up with the same email and password', async () => {
    const email = `shopper-${Date.now()}@test.local`;
    const id = makeUser();
    db.update(users).set({ email, passwordHash: await bcrypt.hash('password123', 4) }).where(eq(users.id, id)).run();
    const res = await register(post({ email, password: 'password123', role: 'provider', phone: '08031234567', profile }));
    expect(res.status).toBe(200);
    expect((await res.json()).addedToExisting).toBe(true);
    expect(getUserRoles(id)).toContain('provider');
  });

  it('admins see providers in the verification queue and approve them', async () => {
    const id = makeProvider('pending');
    signInAs(makeUser({ role: 'admin' }));
    const list = (await (await adminVerifications()).json()).accounts;
    expect(list.find((a: any) => a.id === id)).toMatchObject({ reviewRole: 'provider', approvalStatus: 'pending' });
    setRoleApproval(id, 'provider', 'approved', null);
    expect(db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).get()!.approvalStatus).toBe('approved');
  });

  it('links stay unique when two businesses share a name', () => {
    const a = makeUser();
    const b = makeUser();
    expect(upsertProvider(a, { ...profile, businessName: 'Fine Cuts', phone: '08031234567' }).slug).toBe('fine-cuts');
    expect(upsertProvider(b, { ...profile, businessName: 'Fine Cuts', phone: '08031234567' }).slug).toBe('fine-cuts-2');
  });
});

describe('who customers can book', () => {
  it('only approved providers are listed and bookable', async () => {
    const { id, svc } = bookableProvider('pending');
    const slug = db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).get()!.slug;
    expect(listedProviders().some((p) => p.id === id)).toBe(false);
    expect(publicProvider(slug)).toBeUndefined();
    const start = lagosMoment('2030-03-05', '10:00');
    await expect(createBooking({ customerId: makeUser(), serviceId: svc.id, startsAt: start, now: lagosMoment('2030-03-04', '08:00') })).rejects.toThrow(/no longer available/);

    setRoleApproval(id, 'provider', 'approved', null);
    const listed = listedProviders().find((p) => p.id === id)!;
    expect(listed.services.map((s) => s.name)).toEqual(['Knotless braids']);
    expect(publicProvider(slug)!.businessName).toBe('Test Studio');
  });

  it('a store owner can buy and book elsewhere, but not book their own service business', async () => {
    const vendor = makeVendor('approved');
    const { svc } = bookableProvider('approved', vendor);
    await expect(createBooking({ customerId: vendor, serviceId: svc.id, startsAt: lagosMoment('2030-03-05', '10:00'), now: lagosMoment('2030-03-04', '08:00') }))
      .rejects.toMatchObject({ code: 'OWN_STORE' });
  });
});

describe('portfolio of past work', () => {
  it('a provider adds photos to their own service; customers see them', async () => {
    const { id, svc } = bookableProvider();
    addPortfolioItem(id, svc.id, { imageUrl: photo(1), caption: 'Waist-length knotless' });
    addPortfolioItem(id, svc.id, { imageUrl: photo(2) });
    const pub = publicPortfolio(svc.id)!;
    expect(pub.items.map((i) => i.caption)).toEqual(['Waist-length knotless', null]);
    const listed = listedProviders().find((p) => p.id === id)!;
    expect(listed.services[0]).toMatchObject({ portfolioCount: 2, cover: photo(1) });

    const res = await portfolioApi(new Request('http://test.local'), params({ serviceId: svc.id }));
    expect((await res.json()).items).toHaveLength(2);
  });

  it('refuses photos that weren\'t uploaded here, other people\'s services, and more than the limit', async () => {
    const { id, svc } = bookableProvider();
    const other = bookableProvider();
    expect(() => addPortfolioItem(id, svc.id, { imageUrl: 'https://example.com/x.jpg' })).toThrow(/Upload a photo/);
    expect(() => addPortfolioItem(id, other.svc.id, { imageUrl: photo(3) })).toThrow(/not found/);
    for (let i = 0; i < PORTFOLIO_LIMIT; i++) addPortfolioItem(id, svc.id, { imageUrl: photo(10 + i) });
    expect(() => addPortfolioItem(id, svc.id, { imageUrl: photo(99) })).toThrow(/up to 12 photos/);
    const item = db.select().from(servicePortfolio).where(eq(servicePortfolio.serviceId, svc.id)).get()!;
    expect(() => removePortfolioItem(other.id, item.id)).toThrow(/not found/);
    removePortfolioItem(id, item.id);
  });

  it('only the provider can add photos through the API', async () => {
    const { svc } = bookableProvider();
    signInAs(makeUser());
    expect((await addPhoto(jsonRequest('POST', { imageUrl: photo(5) }), params({ serviceId: svc.id }))).status).toBe(403);
  });

  it('portfolios of unlisted providers are hidden, and removing a service removes its photos', () => {
    const pending = bookableProvider('pending');
    addPortfolioItem(pending.id, pending.svc.id, { imageUrl: photo(7) });
    expect(publicPortfolio(pending.svc.id)).toBeUndefined();

    const { id, svc } = bookableProvider();
    addPortfolioItem(id, svc.id, { imageUrl: photo(8) });
    expect(deleteService(id, svc.id)).toEqual({ deleted: true, paused: false });
    expect(db.select().from(servicePortfolio).where(eq(servicePortfolio.serviceId, svc.id)).all()).toEqual([]);
  });
});
