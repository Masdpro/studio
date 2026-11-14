/**
 * Services are booked, not bought. A customer picks a service, a free time and a place, and pays from
 * their wallet; Closebuy holds the money until the provider enters the customer's 4-digit code at the
 * end of the job. The rules (who can do what, and when) are in state-machines/booking.ts.
 *
 * Times: stored as UTC; opening hours and dates are Lagos time (UTC+1, no daylight saving).
 */
import { randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, services, serviceSettings, servicePortfolio, users, serviceProviders } from '@/db/schema';
import { applyEntry, InsufficientFundsError } from '@/lib/services/wallets';
import { createNotification } from '@/lib/services/notifications';
import { platformFeePercent } from '@/lib/services/earnings';
import { suspendedVendorIds as suspendedAccountIds } from '@/lib/services/products';
import { bookingMachine, BOOKING_ACTIVE, type BookingActor, type BookingStatus } from '@/lib/state-machines';
import { log } from '@/lib/log';
import { lagosClock, lagosDate, lagosMoment, whenLabel } from '@/lib/booking-time';

// ---- Rules (the defaults agreed for stage 1) ----
export const RULES = {
  respondWithinMs: 4 * 3600_000, // a request lapses after 4 hours...
  respondBeforeStartMs: 3600_000, // ...or 1 hour before the slot, whichever is sooner
  freeCancelMs: 24 * 3600_000, // customers cancel or move for free until 24 hours before
  lateCancelProviderShare: 0.5, // a late cancellation or no-show: the provider keeps 50%
  noShowAfterMs: 15 * 60_000, // a no-show can be marked 15 minutes after the start
  completeFromMs: 30 * 60_000, // the code can be entered from 30 minutes before the start
  minNoticeMs: 3600_000, // no bookings sooner than 1 hour from now
  maxAheadDays: 30, // or more than 30 days ahead
  slotStepMin: 30,
  codeAttempts: 5,
};

const DAY_MS = 86400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const naira = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const short = (id: string) => id.slice(0, 8).toUpperCase();

export class BookingError extends Error {
  constructor(message: string, public status = 400, public code?: string, public extra?: Record<string, unknown>) {
    super(message);
    this.name = 'BookingError';
  }
}

// ---- Lagos time ----

export { lagosDate, lagosMoment, lagosClock, whenLabel } from '@/lib/booking-time';
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

// ---- Provider settings ----

export type Interval = [string, string];
export type WeeklyHours = Record<string, Interval[]>; // "0" (Sunday) .. "6"
export type ServiceSettings = { weeklyHours: WeeklyHours; capacity: number; instantBooking: boolean; daysOff: string[] };

export const DEFAULT_HOURS: WeeklyHours = { '0': [], '1': [['09:00', '18:00']], '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '18:00']], '6': [['10:00', '16:00']] };

export function getServiceSettings(providerId: string): ServiceSettings {
  const row = db.select().from(serviceSettings).where(eq(serviceSettings.providerId, providerId)).get();
  if (!row) return { weeklyHours: DEFAULT_HOURS, capacity: 1, instantBooking: true, daysOff: [] };
  return { weeklyHours: safeJson(row.weeklyHours, DEFAULT_HOURS), capacity: row.capacity, instantBooking: row.instantBooking, daysOff: safeJson(row.daysOff, []) };
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Checks and saves a provider's booking settings. Throws BookingError with a message to show. */
export function saveServiceSettings(providerId: string, input: Partial<ServiceSettings>): ServiceSettings {
  const current = getServiceSettings(providerId);
  const next: ServiceSettings = { ...current };
  if (input.weeklyHours !== undefined) {
    const hours: WeeklyHours = {};
    for (let d = 0; d <= 6; d++) {
      const list = (input.weeklyHours as WeeklyHours)?.[String(d)] ?? [];
      if (!Array.isArray(list) || list.length > 3) throw new BookingError('Each day can have up to 3 opening periods.');
      const clean: Interval[] = [];
      for (const iv of list) {
        if (!Array.isArray(iv) || !HHMM.test(iv[0]) || !HHMM.test(iv[1]) || iv[0] >= iv[1]) throw new BookingError('Opening times must be like 09:00, and each period must end after it starts.');
        clean.push([iv[0], iv[1]]);
      }
      clean.sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < clean.length; i++) if (clean[i][0] < clean[i - 1][1]) throw new BookingError('Opening periods on the same day can\'t overlap.');
      hours[String(d)] = clean;
    }
    next.weeklyHours = hours;
  }
  if (input.capacity !== undefined) {
    const c = Math.floor(Number(input.capacity));
    if (!Number.isFinite(c) || c < 1 || c > 50) throw new BookingError('Customers served at the same time must be between 1 and 50.');
    next.capacity = c;
  }
  if (input.instantBooking !== undefined) next.instantBooking = !!input.instantBooking;
  if (input.daysOff !== undefined) {
    if (!Array.isArray(input.daysOff) || input.daysOff.length > 100 || input.daysOff.some((d) => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
      throw new BookingError('Days off must be dates.');
    }
    next.daysOff = Array.from(new Set(input.daysOff)).sort();
  }
  const values = { providerId, weeklyHours: JSON.stringify(next.weeklyHours), capacity: next.capacity, instantBooking: next.instantBooking, daysOff: JSON.stringify(next.daysOff), updatedAt: new Date() };
  db.insert(serviceSettings).values(values).onConflictDoUpdate({ target: serviceSettings.providerId, set: values }).run();
  return next;
}

// ---- Who can be booked ----

/** A provider customers can see and book: approved by Closebuy, and the account isn't suspended. */
export function isListedProvider(providerId: string): boolean {
  const p = db.select({ status: serviceProviders.approvalStatus }).from(serviceProviders).where(eq(serviceProviders.id, providerId)).get();
  return p?.status === 'approved' && !suspendedAccountIds().has(providerId);
}

// ---- Services ----

export type Service = typeof services.$inferSelect;
export type ServiceInput = { name: string; description?: string | null; imageUrl?: string | null; price: number; priceFrom?: boolean; durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee?: number | null; paused?: boolean };

export const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

function cleanServiceInput(input: Partial<ServiceInput>, partial: boolean): Partial<ServiceInput> {
  const out: Partial<ServiceInput> = {};
  if (!partial || input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 2 || name.length > 80) throw new BookingError('Give the service a name (2 to 80 characters).');
    out.name = name;
  }
  if (input.description !== undefined) out.description = typeof input.description === 'string' ? input.description.trim().slice(0, 1000) || null : null;
  if (input.imageUrl !== undefined) out.imageUrl = typeof input.imageUrl === 'string' && input.imageUrl ? input.imageUrl : null;
  if (!partial || input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 100 || price > 10_000_000) throw new BookingError('Set a price of at least ₦100.');
    out.price = round2(price);
  }
  if (input.priceFrom !== undefined) out.priceFrom = !!input.priceFrom;
  if (!partial || input.durationMin !== undefined) {
    const d = Number(input.durationMin);
    if (!DURATIONS.includes(d)) throw new BookingError('Choose how long the service takes.');
    out.durationMin = d;
  }
  if (!partial || input.location !== undefined) {
    if (!['shop', 'home', 'either'].includes(input.location as string)) throw new BookingError('Choose where the service is done.');
    out.location = input.location;
  }
  if (input.callOutFee !== undefined) {
    const fee = input.callOutFee === null || input.callOutFee === ('' as unknown) ? 0 : Number(input.callOutFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) throw new BookingError('The call-out fee must be a number.');
    out.callOutFee = round2(fee);
  }
  if (input.paused !== undefined) out.paused = !!input.paused;
  return out;
}

export function listServices(providerId: string, opts: { includePaused?: boolean } = {}): Service[] {
  const rows = db.select().from(services).where(eq(services.providerId, providerId)).orderBy(asc(services.name)).all();
  return opts.includePaused ? rows : rows.filter((s) => !s.paused);
}

/** Services customers can book: not paused, and the provider isn't suspended. */
export function bookableServices(providerId: string): Service[] {
  if (!isListedProvider(providerId)) return [];
  return listServices(providerId);
}

export function getService(id: string): Service | undefined {
  return db.select().from(services).where(eq(services.id, id)).get();
}

export function createService(providerId: string, input: ServiceInput): Service {
  const clean = cleanServiceInput(input, false) as ServiceInput;
  const row = { id: randomUUID(), providerId, ...clean, priceFrom: clean.priceFrom ?? false, callOutFee: clean.location === 'shop' ? null : clean.callOutFee ?? 0, paused: clean.paused ?? false, createdAt: new Date() };
  db.insert(services).values(row).run();
  return getService(row.id)!;
}

export function updateService(providerId: string, id: string, input: Partial<ServiceInput>): Service {
  const s = getService(id);
  if (!s || s.providerId !== providerId) throw new BookingError('Service not found.', 404);
  const clean = cleanServiceInput(input, true);
  if ((clean.location ?? s.location) === 'shop') clean.callOutFee = null;
  db.update(services).set(clean).where(eq(services.id, id)).run();
  return getService(id)!;
}

/** Removes a service. One with bookings still to come is paused instead, so those bookings keep their details. */
export function deleteService(providerId: string, id: string): { deleted: boolean; paused: boolean } {
  const s = getService(id);
  if (!s || s.providerId !== providerId) throw new BookingError('Service not found.', 404);
  const upcoming = db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.serviceId, id), inArray(bookings.status, [...BOOKING_ACTIVE]))).get();
  if (upcoming) {
    db.update(services).set({ paused: true }).where(eq(services.id, id)).run();
    return { deleted: false, paused: true };
  }
  db.delete(services).where(eq(services.id, id)).run();
  db.delete(servicePortfolio).where(eq(servicePortfolio.serviceId, id)).run();
  return { deleted: true, paused: false };
}

// ---- Free times ----

type Busy = { startsAt: Date; endsAt: Date; id: string };

function busyBookings(providerId: string, from: number, to: number, exceptId?: string): Busy[] {
  return db
    .select({ id: bookings.id, startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(and(eq(bookings.providerId, providerId), inArray(bookings.status, [...BOOKING_ACTIVE]), lt(bookings.startsAt, new Date(to)), gt(bookings.endsAt, new Date(from))))
    .all()
    .filter((b) => b.id !== exceptId);
}

/** Most bookings running at the same moment anywhere in [start, end). */
function peakOverlap(list: Busy[], start: number, end: number): number {
  const points = [start, ...list.map((b) => b.startsAt.getTime()).filter((t) => t > start && t < end)];
  let peak = 0;
  for (const t of points) peak = Math.max(peak, list.filter((b) => b.startsAt.getTime() <= t && b.endsAt.getTime() > t).length);
  return peak;
}

/** Why a start time can't be booked for this service, or null if it can. */
function slotProblem(svc: Service, settings: ServiceSettings, start: number, now: number, exceptId?: string): string | null {
  const date = lagosDate(start);
  const end = start + svc.durationMin * 60_000;
  if (start < now + RULES.minNoticeMs) return 'Bookings must be at least 1 hour from now.';
  if (start > now + RULES.maxAheadDays * DAY_MS) return `Bookings can be made up to ${RULES.maxAheadDays} days ahead.`;
  if (settings.daysOff.includes(date)) return 'The provider is closed that day.';
  const periods = settings.weeklyHours[String(weekday(date))] ?? [];
  const fits = periods.some(([o, c]) => start >= lagosMoment(date, o) && end <= lagosMoment(date, c));
  if (!fits) return 'That time is outside the provider\'s opening hours.';
  if (peakOverlap(busyBookings(svc.providerId, start, end, exceptId), start, end) >= settings.capacity) return 'That time has just been booked. Please choose another.';
  return null;
}

export type Slot = { startsAt: number; label: string };

/** Free start times for a service on a Lagos date. */
export function availableSlots(serviceId: string, date: string, now = Date.now(), exceptBookingId?: string): Slot[] {
  const svc = getService(serviceId);
  if (!svc || svc.paused || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const settings = getServiceSettings(svc.providerId);
  if (settings.daysOff.includes(date)) return [];
  const periods = settings.weeklyHours[String(weekday(date))] ?? [];
  const dayStart = lagosMoment(date, '00:00');
  const busy = busyBookings(svc.providerId, dayStart, dayStart + DAY_MS + svc.durationMin * 60_000, exceptBookingId);
  const step = Math.min(RULES.slotStepMin, svc.durationMin) * 60_000;
  const out: Slot[] = [];
  for (const [o, c] of periods) {
    const close = lagosMoment(date, c);
    for (let t = lagosMoment(date, o); t + svc.durationMin * 60_000 <= close; t += step) {
      if (t < now + RULES.minNoticeMs || t > now + RULES.maxAheadDays * DAY_MS) continue;
      if (peakOverlap(busy, t, t + svc.durationMin * 60_000) >= settings.capacity) continue;
      out.push({ startsAt: t, label: lagosClock(t) });
    }
  }
  return out;
}

/** The Lagos dates a customer can pick: from today, for 30 days, skipping days the provider is closed. */
export function bookableDates(providerId: string, now = Date.now()): string[] {
  const settings = getServiceSettings(providerId);
  const out: string[] = [];
  for (let i = 0; i <= RULES.maxAheadDays; i++) {
    const date = lagosDate(now + i * DAY_MS);
    if (settings.daysOff.includes(date)) continue;
    if ((settings.weeklyHours[String(weekday(date))] ?? []).length) out.push(date);
  }
  return out;
}

// ---- Bookings ----

export type Booking = typeof bookings.$inferSelect;

export function getBooking(id: string): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.id, id)).get();
}

function newCode(): string {
  return String(randomInt(0, 10000)).padStart(4, '0');
}

function providerName(providerId: string): string {
  return db.select({ n: serviceProviders.businessName }).from(serviceProviders).where(eq(serviceProviders.id, providerId)).get()?.n ?? 'the provider';
}

/** Books a slot and takes payment from the customer's wallet, all or nothing. */
export async function createBooking(input: { customerId: string; serviceId: string; startsAt: number; location?: 'shop' | 'home'; address?: string; note?: string; now?: number }): Promise<Booking> {
  const now = input.now ?? Date.now();
  const svc = getService(String(input.serviceId ?? ''));
  if (!svc || svc.paused || !isListedProvider(svc.providerId)) throw new BookingError('This service is no longer available.', 404);
  if (input.customerId === svc.providerId) {
    throw new BookingError('This is your own business, and you can\'t book your own services.', 400, 'OWN_STORE');
  }
  const location = svc.location === 'either' ? input.location : svc.location;
  if (location !== 'shop' && location !== 'home') throw new BookingError('Choose whether the service is at the shop or at your place.');
  const address = typeof input.address === 'string' ? input.address.trim().slice(0, 300) : '';
  if (location === 'home' && address.length < 5) throw new BookingError('Enter the address the provider should come to.');
  const startsAt = Number(input.startsAt);
  if (!Number.isFinite(startsAt) || startsAt % 60_000 !== 0) throw new BookingError('Choose a time.');

  const settings = getServiceSettings(svc.providerId);
  const callOutFee = location === 'home' ? svc.callOutFee ?? 0 : 0;
  const total = round2(svc.price + callOutFee);
  const id = randomUUID();
  const status: BookingStatus = settings.instantBooking ? 'Confirmed' : 'Requested';
  const respondBy = status === 'Requested' ? new Date(Math.min(now + RULES.respondWithinMs, startsAt - RULES.respondBeforeStartMs)) : null;

  // One synchronous transaction: the free-slot check, the booking and the payment can't interleave with another booking.
  try {
    db.transaction((tx) => {
      const problem = slotProblem(svc, settings, startsAt, now);
      if (problem) throw new BookingError(problem, 409, 'SLOT_TAKEN');
      tx.insert(bookings).values({
        id,
        serviceId: svc.id,
        providerId: svc.providerId,
        customerId: input.customerId,
        serviceName: svc.name,
        startsAt: new Date(startsAt),
        endsAt: new Date(startsAt + svc.durationMin * 60_000),
        location,
        address: location === 'home' ? address : null,
        note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null,
        price: svc.price,
        callOutFee,
        total,
        status,
        respondBy,
        completionCode: newCode(),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }).run();
      applyEntry(tx, { id: `booking:${id}`, userId: input.customerId, type: 'purchase', amount: -total, requireFunds: true, orderId: id, description: `Booking · ${svc.name} with ${providerName(svc.providerId)} · ${whenLabel(startsAt)}` });
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      throw new BookingError('Your wallet balance is too low for this booking.', 402, 'INSUFFICIENT_FUNDS', { balance: err.balance, needed: total, shortfall: round2(total - err.balance) });
    }
    throw err;
  }

  const when = whenLabel(startsAt);
  await createNotification({
    userId: svc.providerId,
    message: status === 'Requested'
      ? `New booking request: ${svc.name}, ${when}. Accept or decline before ${lagosClock(respondBy!.getTime())}.`
      : `New booking: ${svc.name}, ${when}${location === 'home' ? ' (home visit)' : ''}.`,
    category: 'Activity',
    link: '/provider/bookings',
    iconName: 'CalendarCheck',
  });
  await createNotification({
    userId: input.customerId,
    message: status === 'Requested'
      ? `Booking request sent: ${svc.name}, ${when}. ${naira(total)} is held until ${providerName(svc.providerId)} accepts; you're refunded if they don't.`
      : `Booked: ${svc.name}, ${when}. Show your code to the provider when the job is done.`,
    category: 'Transaction',
    link: '/bookings',
    iconName: 'CalendarCheck',
  });
  return getBooking(id)!;
}

type MoneyOutcome = { refund: number; providerKeeps: number };

/** Moves a booking to a final status and settles the money, once. */
async function finish(b: Booking, to: BookingStatus, actor: BookingActor | undefined, money: MoneyOutcome, extra: { reason?: string } = {}) {
  const check = bookingMachine.check(b.status as BookingStatus, to, actor, undefined);
  if (!check.ok) throw new BookingError(check.message, 409);
  const pct = platformFeePercent();
  const fee = round2((money.providerKeeps * pct) / 100);
  const providerShare = round2(money.providerKeeps - fee);
  let moved = false;
  db.transaction((tx) => {
    const res = tx.update(bookings)
      .set({ status: to, updatedAt: new Date(), cancelledBy: to === 'Cancelled' ? actor ?? 'system' : b.cancelledBy, cancelReason: extra.reason ?? b.cancelReason })
      .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
      .run();
    if (res.changes !== 1) return; // someone else moved it first
    moved = true;
    if (money.refund > 0) applyEntry(tx, { id: `booking-refund:${b.id}`, userId: b.customerId, type: 'refund', amount: money.refund, orderId: b.id, description: `Refund · ${b.serviceName} (${statusWord(to)})` });
    if (providerShare > 0) applyEntry(tx, { id: `booking-sale:${b.id}`, userId: b.providerId, type: 'sale', amount: providerShare, fee: fee || null, orderId: b.id, description: `Booking · ${b.serviceName} · #${short(b.id)}${to !== 'Completed' ? ` (${statusWord(to)}, ${Math.round(RULES.lateCancelProviderShare * 100)}% kept)` : ''}${fee ? ` · ${naira(fee)} service fee (${pct}%)` : ''}` });
  });
  if (!moved) throw new BookingError('This booking has just changed. Please refresh.', 409);
  return { providerShare, fee };
}

function statusWord(s: BookingStatus): string {
  return { Requested: 'requested', Confirmed: 'confirmed', Completed: 'completed', Declined: 'declined', Expired: 'not answered in time', Cancelled: 'cancelled', NoShow: 'no-show' }[s];
}

function mustOwn(b: Booking | undefined, who: 'customer' | 'provider', userId: string): Booking {
  if (!b || (who === 'customer' ? b.customerId : b.providerId) !== userId) throw new BookingError('Booking not found.', 404);
  return b;
}

export async function acceptBooking(providerId: string, id: string, now = Date.now()) {
  const b = mustOwn(getBooking(id), 'provider', providerId);
  const check = bookingMachine.check(b.status as BookingStatus, 'Confirmed', 'provider', undefined);
  if (!check.ok) throw new BookingError(check.message, 409);
  if (b.respondBy && b.respondBy.getTime() < now) throw new BookingError('This request has run out of time.', 409);
  db.update(bookings).set({ status: 'Confirmed', respondBy: null, updatedAt: new Date(now) }).where(and(eq(bookings.id, id), eq(bookings.status, 'Requested'))).run();
  await createNotification({ userId: b.customerId, message: `${providerName(b.providerId)} accepted your booking: ${b.serviceName}, ${whenLabel(b.startsAt.getTime())}.`, category: 'Activity', link: '/bookings', iconName: 'CalendarCheck' });
  return getBooking(id)!;
}

export async function declineBooking(providerId: string, id: string, reason?: string) {
  const b = mustOwn(getBooking(id), 'provider', providerId);
  await finish(b, 'Declined', 'provider', { refund: b.total, providerKeeps: 0 }, { reason });
  await createNotification({ userId: b.customerId, message: `${providerName(b.providerId)} couldn't take your booking for ${b.serviceName}. ${naira(b.total)} is back in your wallet.`, category: 'Transaction', link: '/bookings', iconName: 'Wallet' });
  return getBooking(id)!;
}

/** What a customer cancelling now would get back. */
export function customerCancelTerms(b: Booking, now = Date.now()): MoneyOutcome & { late: boolean } {
  const late = b.status === 'Confirmed' && !b.movedByProvider && b.startsAt.getTime() - now < RULES.freeCancelMs;
  const providerKeeps = late ? round2(b.total * RULES.lateCancelProviderShare) : 0;
  return { late, providerKeeps, refund: round2(b.total - providerKeeps) };
}

export async function cancelBooking(actor: 'customer' | 'provider' | 'admin', userId: string, id: string, opts: { reason?: string; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  const b = actor === 'admin' ? getBooking(id) : mustOwn(getBooking(id), actor, userId);
  if (!b) throw new BookingError('Booking not found.', 404);
  if (actor === 'admin' && !opts.reason?.trim()) throw new BookingError('Give a reason for cancelling.');
  if (actor !== 'customer' && b.startsAt.getTime() < now && b.status === 'Confirmed' && actor === 'provider') {
    throw new BookingError('This booking has already started. Mark it as a no-show or ask support to settle it.', 409);
  }
  const money = actor === 'customer' ? customerCancelTerms(b, now) : { refund: b.total, providerKeeps: 0 };
  await finish(b, 'Cancelled', actor, money, { reason: opts.reason });
  const when = whenLabel(b.startsAt.getTime());
  if (actor === 'customer') {
    await createNotification({ userId: b.providerId, message: `Booking cancelled by the customer: ${b.serviceName}, ${when}.${money.providerKeeps ? ` You keep ${naira(money.providerKeeps)} (late cancellation).` : ''}`, category: 'Activity', link: '/provider/bookings', iconName: 'CalendarX' });
  } else {
    await createNotification({ userId: b.customerId, message: `Your booking for ${b.serviceName} (${when}) was cancelled by ${actor === 'provider' ? providerName(b.providerId) : 'Closebuy support'}. ${naira(b.total)} is back in your wallet.`, category: 'Transaction', link: '/bookings', iconName: 'Wallet' });
    if (actor === 'admin') await createNotification({ userId: b.providerId, message: `Closebuy support cancelled a booking: ${b.serviceName}, ${when}. Reason: ${opts.reason}`, category: 'Activity', link: '/provider/bookings', iconName: 'CalendarX' });
    else log.info('Provider cancelled a booking', { area: 'bookings', bookingId: b.id, providerId: b.providerId });
  }
  return { booking: getBooking(id)!, ...money };
}

/** Moves a booking to another free time. Customers can do this until 24 hours before; providers any time before it starts. */
export async function rescheduleBooking(actor: 'customer' | 'provider', userId: string, id: string, newStart: number, now = Date.now()) {
  const b = mustOwn(getBooking(id), actor, userId);
  if (!BOOKING_ACTIVE.includes(b.status as BookingStatus)) throw new BookingError('Only upcoming bookings can be moved.', 409);
  if (actor === 'customer' && !b.movedByProvider && b.status === 'Confirmed' && b.startsAt.getTime() - now < RULES.freeCancelMs) {
    throw new BookingError('Bookings can be moved up to 24 hours before. You can still cancel (the provider keeps 50%).', 409);
  }
  if (b.startsAt.getTime() <= now) throw new BookingError('This booking has already started.', 409);
  const svc = getService(b.serviceId);
  if (!svc) throw new BookingError('This service is no longer offered, so the booking can\'t be moved. You can cancel it instead.', 409);
  const start = Number(newStart);
  if (!Number.isFinite(start) || start % 60_000 !== 0) throw new BookingError('Choose a time.');
  const settings = getServiceSettings(b.providerId);
  db.transaction((tx) => {
    const problem = slotProblem(svc, settings, start, now, b.id);
    if (problem) throw new BookingError(problem, 409, 'SLOT_TAKEN');
    tx.update(bookings)
      .set({ startsAt: new Date(start), endsAt: new Date(start + (b.endsAt.getTime() - b.startsAt.getTime())), movedByProvider: actor === 'provider' ? true : b.movedByProvider, remindedDay: false, remindedHour: false, updatedAt: new Date(now) })
      .where(eq(bookings.id, b.id))
      .run();
  });
  const msg = `${b.serviceName} moved from ${whenLabel(b.startsAt.getTime())} to ${whenLabel(start)}`;
  if (actor === 'customer') await createNotification({ userId: b.providerId, message: `The customer ${msg}.`, category: 'Activity', link: '/provider/bookings', iconName: 'CalendarClock' });
  else await createNotification({ userId: b.customerId, message: `${providerName(b.providerId)} ${msg}. If the new time doesn't suit you, you can cancel for a full refund.`, category: 'Activity', link: '/bookings', iconName: 'CalendarClock' });
  return getBooking(id)!;
}

/** The provider enters the customer's code at the end of the job; the provider is paid. */
export async function completeBooking(providerId: string, id: string, typed: unknown, now = Date.now()) {
  const b = mustOwn(getBooking(id), 'provider', providerId);
  if (b.status !== 'Confirmed') throw new BookingError(b.status === 'Requested' ? 'Accept the booking first.' : 'This booking is already closed.', 409);
  if (now < b.startsAt.getTime() - RULES.completeFromMs) throw new BookingError('You can enter the code from 30 minutes before the booking starts.', 409);
  if (b.codeAttempts >= RULES.codeAttempts) throw new BookingError('Too many wrong codes for this booking. Ask the customer to contact Closebuy support.', 429);
  const input = typeof typed === 'string' ? typed.replace(/\D/g, '') : '';
  if (!/^\d{4}$/.test(input)) throw new BookingError('Enter the customer\'s 4-digit code.');
  if (!timingSafeEqual(Buffer.from(b.completionCode), Buffer.from(input))) {
    db.update(bookings).set({ codeAttempts: sql`${bookings.codeAttempts} + 1` }).where(eq(bookings.id, id)).run();
    const left = RULES.codeAttempts - b.codeAttempts - 1;
    throw new BookingError(left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes for this booking. Ask the customer to contact Closebuy support.', 400);
  }
  const { providerShare } = await finish(b, 'Completed', 'provider', { refund: 0, providerKeeps: b.total });
  await createNotification({ userId: providerId, message: `${naira(providerShare)} for ${b.serviceName} is now in your wallet.`, category: 'Transaction', link: '/wallet', iconName: 'Wallet' });
  await createNotification({ userId: b.customerId, message: `Your ${b.serviceName} booking is complete. Thanks for using Closebuy!`, category: 'Activity', link: '/bookings', iconName: 'CalendarCheck' });
  return getBooking(id)!;
}

export async function markNoShow(providerId: string, id: string, now = Date.now()) {
  const b = mustOwn(getBooking(id), 'provider', providerId);
  if (b.status !== 'Confirmed') throw new BookingError('Only confirmed bookings can be marked as a no-show.', 409);
  if (now < b.startsAt.getTime() + RULES.noShowAfterMs) throw new BookingError('You can mark a no-show 15 minutes after the start time.', 409);
  const providerKeeps = round2(b.total * RULES.lateCancelProviderShare);
  await finish(b, 'NoShow', 'provider', { refund: round2(b.total - providerKeeps), providerKeeps });
  await createNotification({ userId: b.customerId, message: `You were marked as not turning up for ${b.serviceName} (${whenLabel(b.startsAt.getTime())}). ${naira(round2(b.total - providerKeeps))} is back in your wallet; the provider kept 50%. Contact support if this is wrong.`, category: 'Transaction', link: '/bookings', iconName: 'Wallet' });
  return getBooking(id)!;
}

/** Support closes a finished job the provider couldn't (e.g. lost code): pays the provider in full. */
export async function adminComplete(id: string, reason: string) {
  const b = getBooking(id);
  if (!b) throw new BookingError('Booking not found.', 404);
  if (!reason?.trim()) throw new BookingError('Give a reason.');
  const { providerShare } = await finish(b, 'Completed', 'admin', { refund: 0, providerKeeps: b.total }, { reason });
  await createNotification({ userId: b.providerId, message: `Closebuy support closed your booking for ${b.serviceName}: ${naira(providerShare)} is now in your wallet.`, category: 'Transaction', link: '/wallet', iconName: 'Wallet' });
  return getBooking(id)!;
}

// ---- Lists ----

export type BookingView = Booking & { providerName?: string; providerSlug?: string; providerAddress?: string; customerName?: string; customerPhone?: string | null; canCancelFree?: boolean; completionCode?: string };

export function bookingsForCustomer(customerId: string, now = Date.now()): BookingView[] {
  const rows = db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.startsAt)).limit(200).all();
  return rows.map((b) => ({
    ...b,
    providerName: providerName(b.providerId),
    ...(() => {
      const p = db.select({ slug: serviceProviders.slug, street: serviceProviders.streetAddress, area: serviceProviders.area, city: serviceProviders.city }).from(serviceProviders).where(eq(serviceProviders.id, b.providerId)).get();
      // The street address is shared with customers who have booked there.
      return { providerSlug: p?.slug ?? '', providerAddress: p ? `${p.street}, ${p.area}, ${p.city}` : '' };
    })(),
    canCancelFree: !customerCancelTerms(b, now).late,
    // The code is only for the customer to show at the end of the job.
    completionCode: b.status === 'Confirmed' ? b.completionCode : '',
  }));
}

/** A provider's bookings, without the completion codes. */
export function bookingsForProvider(providerId: string): BookingView[] {
  const rows = db.select().from(bookings).where(eq(bookings.providerId, providerId)).orderBy(asc(bookings.startsAt)).limit(500).all();
  return rows.map((b) => {
    const u = db.select({ n: users.displayName, e: users.email, p: users.phone }).from(users).where(eq(users.id, b.customerId)).get();
    // The phone number is shared only for upcoming bookings, so the provider can reach the customer.
    return { ...b, completionCode: '', customerName: u?.n ?? u?.e ?? 'Customer', customerPhone: BOOKING_ACTIVE.includes(b.status as BookingStatus) ? u?.p ?? null : null };
  });
}

/** For support: every booking that hasn't been closed, oldest first, plus the latest closed ones. */
export function bookingsForAdmin(): BookingView[] {
  const open = db.select().from(bookings).where(inArray(bookings.status, [...BOOKING_ACTIVE])).orderBy(asc(bookings.startsAt)).limit(300).all();
  const closed = db.select().from(bookings).where(sql`${bookings.status} NOT IN ('Requested','Confirmed')`).orderBy(desc(bookings.updatedAt)).limit(100).all();
  return [...open, ...closed].map((b) => ({ ...b, completionCode: '', providerName: providerName(b.providerId) }));
}

// ---- Timers ----

/** Lapses unanswered requests and sends reminders. Safe to run as often as you like. */
export async function runBookingJobs(now = Date.now()): Promise<{ expired: number; reminders: number }> {
  let expired = 0;
  let reminders = 0;
  const lapsed = db.select().from(bookings).where(and(eq(bookings.status, 'Requested'), lt(bookings.respondBy, new Date(now)))).all();
  for (const b of lapsed) {
    try {
      await finish(b, 'Expired', undefined, { refund: b.total, providerKeeps: 0 });
      expired++;
      await createNotification({ userId: b.customerId, message: `${providerName(b.providerId)} didn't answer your booking request for ${b.serviceName} in time. ${naira(b.total)} is back in your wallet.`, category: 'Transaction', link: '/bookings', iconName: 'Wallet' });
      await createNotification({ userId: b.providerId, message: `A booking request lapsed because it wasn't answered in time: ${b.serviceName}, ${whenLabel(b.startsAt.getTime())}.`, category: 'Activity', link: '/provider/bookings', iconName: 'CalendarX' });
    } catch (err) {
      if (!(err instanceof BookingError)) throw err;
    }
  }
  const upcoming = db.select().from(bookings).where(and(eq(bookings.status, 'Confirmed'), gt(bookings.startsAt, new Date(now)), lt(bookings.startsAt, new Date(now + DAY_MS)))).all();
  for (const b of upcoming) {
    const left = b.startsAt.getTime() - now;
    const which = left <= 3600_000 ? (b.remindedHour ? null : 'hour') : b.remindedDay ? null : 'day';
    if (!which) continue;
    const claimed = db.update(bookings).set(which === 'hour' ? { remindedHour: true, remindedDay: true } : { remindedDay: true }).where(and(eq(bookings.id, b.id), eq(which === 'hour' ? bookings.remindedHour : bookings.remindedDay, false))).run();
    if (claimed.changes !== 1) continue;
    reminders++;
    const when = which === 'hour' ? `at ${lagosClock(b.startsAt.getTime())} today` : whenLabel(b.startsAt.getTime());
    const place = b.location === 'home' ? `at ${b.address}` : `at ${providerName(b.providerId)}`;
    await createNotification({ userId: b.customerId, message: `Reminder: ${b.serviceName} ${when}, ${place}.`, category: 'Activity', link: '/bookings', iconName: 'Bell' });
    await createNotification({ userId: b.providerId, message: `Reminder: ${b.serviceName} ${when}${b.location === 'home' ? ` (home visit: ${b.address})` : ''}.`, category: 'Activity', link: '/provider/bookings', iconName: 'Bell' });
  }
  return { expired, reminders };
}

let timer: ReturnType<typeof setInterval> | null = null;
/** Starts the once-a-minute booking timer (server start). */
export function startBookingSchedule() {
  if (timer || process.env.NODE_ENV === 'test') return;
  timer = setInterval(() => {
    runBookingJobs().catch((err) => log.error('Booking timer failed', { area: 'jobs', err }));
  }, 60_000);
  timer.unref?.();
}
