/**
 * Service businesses ("providers"): people customers book, kept apart from product stores.
 * A provider's id is the owner's account id, so one login can run a store and a service business.
 */
import { randomUUID } from 'crypto';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookings as bookingsTable, servicePortfolio, serviceProviders, services as servicesTable, users, walletTransactions } from '@/db/schema';
import { isServiceCategory, type ServiceCategoryId } from '@/lib/service-categories';
import { normalizeNigerianPhone } from '@/lib/verification';
import { suspendedVendorIds as suspendedAccountIds } from '@/lib/services/products';
import { availableSlots, BookingError, bookableServices, getService, getServiceSettings, lagosDate, type WeeklyHours } from '@/lib/services/bookings';
import { whenLabel } from '@/lib/booking-time';

export type Provider = typeof serviceProviders.$inferSelect;
export type PortfolioItem = typeof servicePortfolio.$inferSelect;

/** Fields a provider fills in at sign-up and on their profile. */
export const PROVIDER_FIELDS = ['businessName', 'category', 'tagline', 'about', 'contactEmail', 'phone', 'streetAddress', 'area', 'city', 'imageUrl', 'since'] as const;
export type ProviderInput = Partial<Record<(typeof PROVIDER_FIELDS)[number], unknown>>;

const UPLOADED_IMAGE = /^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;
export const PORTFOLIO_LIMIT = 12;

export function getProvider(id: string): Provider | undefined {
  return db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).get();
}

export function getProviderBySlug(slug: string): Provider | undefined {
  return db.select().from(serviceProviders).where(eq(serviceProviders.slug, slug)).get();
}

function slugBase(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'provider';
}

/** A link name no other provider uses. */
function uniqueSlug(name: string, selfId?: string): string {
  const base = slugBase(name);
  for (let i = 1; i < 500; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = getProviderBySlug(slug);
    if (!taken || taken.id === selfId) return slug;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/**
 * Creates or updates the provider profile for an account. New profiles start pending (an admin reviews them).
 * Throws BookingError with a message to show when something is missing.
 */
export function upsertProvider(userId: string, input: ProviderInput): Provider {
  const existing = getProvider(userId);
  const account = db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, userId)).get();
  if (!account) throw new BookingError('Account not found.', 404);
  const patch: Partial<Provider> = {};
  const want = (k: keyof ProviderInput) => !existing || input[k] !== undefined;

  if (want('businessName')) {
    const name = text(input.businessName, 80);
    if (name.length < 2) throw new BookingError('Enter your business name.');
    patch.businessName = name;
  }
  if (want('category')) {
    if (!isServiceCategory(input.category)) throw new BookingError('Choose what kind of service you offer.');
    patch.category = input.category as ServiceCategoryId;
  }
  if (want('streetAddress')) {
    const v = text(input.streetAddress, 200);
    if (v.length < 5) throw new BookingError('Enter your business address.');
    patch.streetAddress = v;
  }
  if (want('area')) {
    const v = text(input.area, 60);
    if (v.length < 2) throw new BookingError('Enter the area customers know you by, e.g. Lekki Phase 1.');
    patch.area = v;
  }
  if (want('city')) {
    const v = text(input.city, 60);
    if (v.length < 2) throw new BookingError('Enter your city.');
    patch.city = v;
  }
  if (want('phone')) {
    const p = typeof input.phone === 'string' ? normalizeNigerianPhone(input.phone) : account.phone;
    if (!p) throw new BookingError('Enter a valid Nigerian mobile number, e.g. 08012345678.');
    patch.phone = p;
  }
  if (input.contactEmail !== undefined || !existing) {
    const e = text(input.contactEmail, 120).toLowerCase() || account.email;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new BookingError('Enter a valid contact email.');
    patch.contactEmail = e;
  }
  if (input.tagline !== undefined) patch.tagline = text(input.tagline, 120) || null;
  if (input.about !== undefined) patch.about = (typeof input.about === 'string' ? input.about.trim().slice(0, 1500) : '') || null;
  if (input.imageUrl !== undefined) patch.imageUrl = typeof input.imageUrl === 'string' && UPLOADED_IMAGE.test(input.imageUrl) ? input.imageUrl : null;
  if (input.since !== undefined) {
    const y = Number(input.since);
    patch.since = input.since === null || input.since === '' ? null : Number.isInteger(y) && y >= 1950 && y <= new Date().getFullYear() ? y : (() => { throw new BookingError('Enter the year you started, e.g. 2018.'); })();
  }

  if (existing) {
    if (patch.businessName && patch.businessName !== existing.businessName) patch.slug = uniqueSlug(patch.businessName, userId);
    if (Object.keys(patch).length) db.update(serviceProviders).set(patch).where(eq(serviceProviders.id, userId)).run();
  } else {
    db.insert(serviceProviders).values({
      id: userId,
      slug: uniqueSlug(patch.businessName!),
      country: 'Nigeria',
      approvalStatus: 'pending',
      createdAt: new Date(),
      ...(patch as Required<Pick<Provider, 'businessName' | 'category' | 'contactEmail' | 'phone' | 'streetAddress' | 'area' | 'city'>>),
      tagline: patch.tagline ?? null,
      about: patch.about ?? null,
      imageUrl: patch.imageUrl ?? null,
      since: patch.since ?? null,
    }).run();
  }
  return getProvider(userId)!;
}

// ---- Portfolio ----

export function portfolioFor(serviceId: string): PortfolioItem[] {
  return db.select().from(servicePortfolio).where(eq(servicePortfolio.serviceId, serviceId)).orderBy(asc(servicePortfolio.position), asc(servicePortfolio.createdAt)).all();
}

function ownService(providerId: string, serviceId: string) {
  const s = getService(serviceId);
  if (!s || s.providerId !== providerId) throw new BookingError('Service not found.', 404);
  return s;
}

/** Adds an uploaded photo of past work to one of the provider's services. */
export function addPortfolioItem(providerId: string, serviceId: string, input: { imageUrl?: unknown; caption?: unknown }): PortfolioItem {
  ownService(providerId, serviceId);
  if (typeof input.imageUrl !== 'string' || !UPLOADED_IMAGE.test(input.imageUrl)) throw new BookingError('Upload a photo first.');
  const count = db.select({ n: sql<number>`count(*)` }).from(servicePortfolio).where(eq(servicePortfolio.serviceId, serviceId)).get()?.n ?? 0;
  if (count >= PORTFOLIO_LIMIT) throw new BookingError(`A service can show up to ${PORTFOLIO_LIMIT} photos. Remove one to add another.`);
  const row = { id: randomUUID(), serviceId, providerId, imageUrl: input.imageUrl, caption: text(input.caption, 140) || null, position: count, createdAt: new Date() };
  db.insert(servicePortfolio).values(row).run();
  return row;
}

export function updatePortfolioCaption(providerId: string, itemId: string, caption: unknown): PortfolioItem {
  const item = db.select().from(servicePortfolio).where(eq(servicePortfolio.id, itemId)).get();
  if (!item || item.providerId !== providerId) throw new BookingError('Photo not found.', 404);
  db.update(servicePortfolio).set({ caption: text(caption, 140) || null }).where(eq(servicePortfolio.id, itemId)).run();
  return { ...item, caption: text(caption, 140) || null };
}

export function removePortfolioItem(providerId: string, itemId: string): void {
  const item = db.select().from(servicePortfolio).where(eq(servicePortfolio.id, itemId)).get();
  if (!item || item.providerId !== providerId) throw new BookingError('Photo not found.', 404);
  db.delete(servicePortfolio).where(eq(servicePortfolio.id, itemId)).run();
}

// ---- What customers see ----

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceFrom: boolean;
  durationMin: number;
  location: 'shop' | 'home' | 'either';
  callOutFee: number | null;
  portfolioCount: number;
  cover: string | null; // first portfolio photo
};

export type PublicProvider = {
  id: string;
  slug: string;
  businessName: string;
  category: string;
  tagline: string | null;
  about: string | null;
  area: string;
  city: string;
  imageUrl: string | null;
  since: number | null;
  instantBooking: boolean;
  weeklyHours: WeeklyHours;
  nextFree: { at: number; label: string; today: boolean } | null;
  services: PublicService[];
};

/** The earliest free start for any of these services in the next week. */
function nextFreeSlot(serviceIds: string[], now: number): PublicProvider['nextFree'] {
  for (let i = 0; i < 8; i++) {
    const date = lagosDate(now + i * 86400_000);
    let best: number | null = null;
    for (const id of serviceIds) {
      const first = availableSlots(id, date, now)[0];
      if (first && (best === null || first.startsAt < best)) best = first.startsAt;
    }
    if (best !== null) return { at: best, label: whenLabel(best), today: i === 0 };
  }
  return null;
}

function toPublic(p: Provider, now: number): PublicProvider {
  const list = bookableServices(p.id);
  const ids = list.map((s) => s.id);
  const photos = ids.length ? db.select().from(servicePortfolio).where(inArray(servicePortfolio.serviceId, ids)).orderBy(asc(servicePortfolio.position), asc(servicePortfolio.createdAt)).all() : [];
  const settings = getServiceSettings(p.id);
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    category: p.category,
    tagline: p.tagline,
    about: p.about,
    area: p.area,
    city: p.city,
    imageUrl: p.imageUrl,
    since: p.since,
    instantBooking: settings.instantBooking,
    weeklyHours: settings.weeklyHours,
    nextFree: nextFreeSlot(ids, now),
    services: list.map((s) => {
      const mine = photos.filter((x) => x.serviceId === s.id);
      return { id: s.id, name: s.name, description: s.description, price: s.price, priceFrom: s.priceFrom, durationMin: s.durationMin, location: s.location, callOutFee: s.callOutFee, portfolioCount: mine.length, cover: mine[0]?.imageUrl ?? null };
    }),
  };
}

/** Every approved provider with at least one bookable service. */
export function listedProviders(now = Date.now()): PublicProvider[] {
  const suspended = suspendedAccountIds();
  const rows = db.select().from(serviceProviders).where(eq(serviceProviders.approvalStatus, 'approved')).orderBy(asc(serviceProviders.businessName)).all();
  return rows.filter((p) => !suspended.has(p.id)).map((p) => toPublic(p, now)).filter((p) => p.services.length > 0);
}

/** One provider's public page, or undefined if it isn't listed. */
export function publicProvider(slug: string, now = Date.now()): PublicProvider | undefined {
  const p = getProviderBySlug(slug);
  if (!p || p.approvalStatus !== 'approved' || suspendedAccountIds().has(p.id)) return undefined;
  return toPublic(p, now);
}

/** A service's portfolio, for customers: only when the provider is listed and the service bookable. */
export function publicPortfolio(serviceId: string): { serviceName: string; providerName: string; items: Pick<PortfolioItem, 'id' | 'imageUrl' | 'caption'>[] } | undefined {
  const s = getService(serviceId);
  if (!s || s.paused) return undefined;
  const p = getProvider(s.providerId);
  if (!p || p.approvalStatus !== 'approved' || suspendedAccountIds().has(p.id)) return undefined;
  return { serviceName: s.name, providerName: p.businessName, items: portfolioFor(serviceId).map(({ id, imageUrl, caption }) => ({ id, imageUrl, caption })) };
}


// ---- Dashboard ----

export type ProviderSummary = {
  provider: Provider;
  services: number;
  pausedServices: number;
  servicesWithoutPhotos: number;
  requests: number; // waiting for an answer
  upcoming: { id: string; serviceName: string; startsAt: number; location: 'shop' | 'home'; status: string }[];
  completedThisMonth: number;
  earnedThisMonth: number;
};

/** What the provider dashboard shows at a glance. */
export function providerSummary(providerId: string, now = Date.now()): ProviderSummary | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  const all = db.select().from(servicesTable).where(eq(servicesTable.providerId, providerId)).all();
  const photoCounts = new Map<string, number>();
  if (all.length) {
    for (const r of db.select({ s: servicePortfolio.serviceId }).from(servicePortfolio).where(inArray(servicePortfolio.serviceId, all.map((s) => s.id))).all()) photoCounts.set(r.s, (photoCounts.get(r.s) ?? 0) + 1);
  }
  const mine = db.select().from(bookingsTable).where(eq(bookingsTable.providerId, providerId)).all();
  const monthStart = (() => {
    const d = new Date(now + 3600_000); // Lagos
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 3600_000;
  })();
  const earned = db
    .select({ total: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)` })
    .from(walletTransactions)
    .where(sql`${walletTransactions.userId} = ${providerId} AND ${walletTransactions.id} LIKE 'booking-sale:%' AND ${walletTransactions.createdAt} >= ${monthStart}`)
    .get()?.total ?? 0;
  return {
    provider,
    services: all.filter((s) => !s.paused).length,
    pausedServices: all.filter((s) => s.paused).length,
    servicesWithoutPhotos: all.filter((s) => !s.paused && !photoCounts.get(s.id)).length,
    requests: mine.filter((b) => b.status === 'Requested').length,
    upcoming: mine
      .filter((b) => (b.status === 'Confirmed' || b.status === 'Requested') && b.endsAt.getTime() > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5)
      .map((b) => ({ id: b.id, serviceName: b.serviceName, startsAt: b.startsAt.getTime(), location: b.location, status: b.status })),
    completedThisMonth: mine.filter((b) => b.status === 'Completed' && b.updatedAt.getTime() >= monthStart).length,
    earnedThisMonth: Math.round(earned * 100) / 100,
  };
}
