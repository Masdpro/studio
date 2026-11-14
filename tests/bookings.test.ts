/**
 * Services are booked, not bought: free times from opening hours, payment held until the job is
 * done, the completion code, cancellations, no-shows, reminders and lapsed requests.
 */
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, wallets } from '@/db/schema';
import { postEntry } from '@/lib/services/wallets';
import {
  availableSlots, bookableDates, BookingError, cancelBooking, completeBooking, createBooking, createService, customerCancelTerms,
  declineBooking, acceptBooking, getBooking, lagosDate, lagosMoment, markNoShow, rescheduleBooking, runBookingJobs, saveServiceSettings,
  adminComplete, deleteService, bookingsForProvider, bookingsForCustomer,
} from '@/lib/services/bookings';
import { bookingMachine } from '@/lib/state-machines';
import { GET as servicesApi } from '@/app/api/services/route';
import { POST as bookApi } from '@/app/api/bookings/route';
import { POST as providerAction } from '@/app/api/provider/bookings/[bookingId]/route';
import { POST as addService } from '@/app/api/provider/services/route';
import { jsonRequest, makeProvider, makeUser, params, signInAs } from './helpers';

const H = 3600_000;
// A Monday, 08:00 in Lagos (07:00 UTC), well in the future so real time never interferes.
const MONDAY = '2030-03-04';
const NOW = lagosMoment(MONDAY, '08:00');
const at = (date: string, hhmm: string) => lagosMoment(date, hhmm);
const TUESDAY = '2030-03-05';
const WEDNESDAY = '2030-03-06';

const balance = (userId: string) => db.select().from(wallets).where(eq(wallets.userId, userId)).get()?.balance ?? 0;
const fund = (userId: string, amount = 50000) => postEntry({ id: `topup:${randomUUID()}`, userId, type: 'funding', amount, description: 'Test top-up' });

function shop(opts: { capacity?: number; instant?: boolean; location?: 'shop' | 'home' | 'either' } = {}) {
  const provider = makeProvider();
  saveServiceSettings(provider, { capacity: opts.capacity ?? 1, instantBooking: opts.instant ?? true, weeklyHours: { '0': [], '1': [['09:00', '13:00'], ['14:00', '18:00']], '2': [['09:00', '18:00']], '3': [['09:00', '18:00']], '4': [['09:00', '18:00']], '5': [['09:00', '18:00']], '6': [] } });
  const svc = createService(provider, { name: 'Haircut', price: 5000, durationMin: 60, location: opts.location ?? 'shop', callOutFee: 2000 });
  return { provider, svc };
}
function customer(amount = 50000) {
  const c = makeUser();
  fund(c, amount);
  return c;
}
const book = (customerId: string, serviceId: string, startsAt: number, extra: object = {}) => createBooking({ customerId, serviceId, startsAt, now: NOW, ...extra });

describe('opening hours and free times', () => {
  it('offers times inside opening hours, skipping breaks, the next hour, days off and booked slots', async () => {
    const { provider, svc } = shop();
    const today = availableSlots(svc.id, MONDAY, NOW).map((s) => s.label);
    expect(today[0]).toBe('09:00'); // 1 hour from 08:00
    expect(today).not.toContain('12:30'); // would run into the 13:00 break
    expect(today).not.toContain('13:00');
    expect(today).toContain('14:00');
    expect(today.at(-1)).toBe('17:00');
    expect(availableSlots(svc.id, '2030-03-10', NOW)).toEqual([]); // Sunday: closed

    await book(customer(), svc.id, at(TUESDAY, '10:00'));
    const tue = availableSlots(svc.id, TUESDAY, NOW).map((s) => s.label);
    expect(tue).not.toContain('09:30'); // overlaps 10:00-11:00
    expect(tue).not.toContain('10:30');
    expect(tue).toContain('11:00');

    saveServiceSettings(provider, { daysOff: [WEDNESDAY] });
    expect(availableSlots(svc.id, WEDNESDAY, NOW)).toEqual([]);
    expect(bookableDates(provider, NOW)).not.toContain(WEDNESDAY);
    expect(bookableDates(provider, NOW)).not.toContain('2030-03-10');
  });

  it('serves several customers at once when the provider has the capacity', async () => {
    const { svc } = shop({ capacity: 2 });
    await book(customer(), svc.id, at(TUESDAY, '10:00'));
    expect(availableSlots(svc.id, TUESDAY, NOW).map((s) => s.label)).toContain('10:00');
    await book(customer(), svc.id, at(TUESDAY, '10:00'));
    expect(availableSlots(svc.id, TUESDAY, NOW).map((s) => s.label)).not.toContain('10:00');
    await expect(book(customer(), svc.id, at(TUESDAY, '10:00'))).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });

  it('refuses bad settings with a clear message', () => {
    const v = makeProvider();
    expect(() => saveServiceSettings(v, { weeklyHours: { '1': [['18:00', '09:00']] } as any })).toThrow(/end after it starts/);
    expect(() => saveServiceSettings(v, { weeklyHours: { '1': [['09:00', '13:00'], ['12:00', '18:00']] } as any })).toThrow(/overlap/);
    expect(() => saveServiceSettings(v, { capacity: 0 })).toThrow(/between 1 and 50/);
  });
});

describe('booking and paying', () => {
  it('takes payment when booking; instant booking confirms straight away', async () => {
    const { provider, svc } = shop();
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    expect(b).toMatchObject({ status: 'Confirmed', total: 5000, location: 'shop' });
    expect(b.completionCode).toMatch(/^\d{4}$/);
    expect(balance(c)).toBe(5000);
    expect(balance(provider)).toBe(0); // held until the job is done
  });

  it('adds the call-out fee for a home visit and needs an address', async () => {
    const { svc } = shop({ location: 'either' });
    const c = customer();
    await expect(book(c, svc.id, at(TUESDAY, '10:00'), { location: 'home' })).rejects.toThrow(/address/);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'), { location: 'home', address: '12 Allen Avenue, Ikeja' });
    expect(b).toMatchObject({ total: 7000, callOutFee: 2000, address: '12 Allen Avenue, Ikeja' });
  });

  it('refuses times outside the rules, a short wallet, and the provider\'s own services', async () => {
    const { provider, svc } = shop();
    const c = customer(1000);
    await expect(book(c, svc.id, at(MONDAY, '08:30'))).rejects.toThrow(/at least 1 hour/);
    await expect(book(c, svc.id, at('2030-04-15', '10:00'))).rejects.toThrow(/30 days/);
    await expect(book(c, svc.id, at(TUESDAY, '19:00'))).rejects.toThrow(/opening hours/);
    await expect(book(c, svc.id, at(TUESDAY, '10:00'))).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS', status: 402 });
    expect(availableSlots(svc.id, TUESDAY, NOW).map((s) => s.label)).toContain('10:00'); // nothing was held
    fund(provider);
    await expect(book(provider, svc.id, at(TUESDAY, '10:00'))).rejects.toMatchObject({ code: 'OWN_STORE' });
  });
});

describe('requests the provider approves', () => {
  it('waits for the provider; declining refunds in full', async () => {
    const { provider, svc } = shop({ instant: false });
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    expect(b.status).toBe('Requested');
    expect(b.respondBy?.getTime()).toBe(NOW + 4 * H);
    await declineBooking(provider, b.id);
    expect(getBooking(b.id)?.status).toBe('Declined');
    expect(balance(c)).toBe(10000);
  });

  it('lapses after 4 hours (or 1 hour before the slot) and refunds; accepted requests are confirmed', async () => {
    const { provider, svc } = shop({ instant: false });
    const c = customer(20000);
    const soon = await book(c, svc.id, at(MONDAY, '11:00')); // 3 hours away: must answer by 10:00
    expect(soon.respondBy?.getTime()).toBe(at(MONDAY, '10:00'));
    const later = await book(c, svc.id, at(TUESDAY, '10:00'));
    await acceptBooking(provider, later.id, NOW + H);
    expect(getBooking(later.id)?.status).toBe('Confirmed');

    expect(await runBookingJobs(at(MONDAY, '10:01'))).toMatchObject({ expired: 1 });
    expect(getBooking(soon.id)?.status).toBe('Expired');
    expect(balance(c)).toBe(15000);
    expect((await runBookingJobs(at(MONDAY, '10:02'))).expired).toBe(0); // only once
  });
});

describe('cancelling and moving', () => {
  it('free until 24 hours before; after that the provider keeps 50%', async () => {
    const { provider, svc } = shop();
    const c = customer(20000);
    const early = await book(c, svc.id, at(WEDNESDAY, '10:00'));
    expect((await cancelBooking('customer', c, early.id, { now: NOW })).refund).toBe(5000);
    const late = await book(c, svc.id, at(TUESDAY, '10:00'));
    expect(customerCancelTerms(late, at(MONDAY, '12:00'))).toMatchObject({ late: true, refund: 2500, providerKeeps: 2500 });
    await cancelBooking('customer', c, late.id, { now: at(MONDAY, '12:00') });
    expect(balance(c)).toBe(17500);
    expect(balance(provider)).toBe(2500);
  });

  it('customers can move a booking until 24 hours before; a provider\'s move makes cancelling free again', async () => {
    const { provider, svc } = shop();
    const c = customer();
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    await rescheduleBooking('customer', c, b.id, at(TUESDAY, '09:00'), NOW);
    expect(getBooking(b.id)?.startsAt.getTime()).toBe(at(TUESDAY, '09:00'));
    await expect(rescheduleBooking('customer', c, b.id, at(TUESDAY, '11:00'), at(MONDAY, '12:00'))).rejects.toThrow(/24 hours/);

    await rescheduleBooking('provider', provider, b.id, at(TUESDAY, '15:00'), at(MONDAY, '12:00'));
    expect(customerCancelTerms(getBooking(b.id)!, at(MONDAY, '13:00')).late).toBe(false);
  });

  it('a provider cancelling refunds in full', async () => {
    const { provider, svc } = shop();
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    await cancelBooking('provider', provider, b.id, { now: NOW });
    expect(balance(c)).toBe(10000);
    expect(balance(provider)).toBe(0);
  });
});

describe('finishing the job', () => {
  it('the provider enters the customer\'s code and is paid; wrong codes are limited', async () => {
    const { provider, svc } = shop();
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    await expect(completeBooking(provider, b.id, b.completionCode, NOW)).rejects.toThrow(/30 minutes before/);
    const during = at(TUESDAY, '10:50');
    const wrong = b.completionCode === '0000' ? '1111' : '0000';
    await expect(completeBooking(provider, b.id, wrong, during)).rejects.toThrow(/4 tries left/);
    await completeBooking(provider, b.id, b.completionCode, during);
    expect(getBooking(b.id)?.status).toBe('Completed');
    expect(balance(provider)).toBe(5000);
    expect(balance(c)).toBe(5000);
    await expect(completeBooking(provider, b.id, b.completionCode, during)).rejects.toThrow(/already closed/);
  });

  it('a no-show can be marked 15 minutes after the start: the provider keeps 50%', async () => {
    const { provider, svc } = shop();
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    await expect(markNoShow(provider, b.id, at(TUESDAY, '10:10'))).rejects.toThrow(/15 minutes/);
    await markNoShow(provider, b.id, at(TUESDAY, '10:16'));
    expect(balance(provider)).toBe(2500);
    expect(balance(c)).toBe(7500);
  });

  it('nothing is paid out on its own: support settles a job nobody closed', async () => {
    const { provider, svc } = shop();
    const c = customer(10000);
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    await runBookingJobs(at('2030-03-08', '10:00'));
    expect(getBooking(b.id)?.status).toBe('Confirmed');
    await expect(adminComplete(b.id, '')).rejects.toThrow(/reason/);
    await adminComplete(b.id, 'Provider lost the code; customer confirmed by phone');
    expect(balance(provider)).toBe(5000);
  });
});

describe('reminders and lists', () => {
  it('reminds both sides the day before and an hour before, once each', async () => {
    const { provider, svc } = shop();
    const c = customer();
    await book(c, svc.id, at(TUESDAY, '10:00'));
    const count = (u: string) => db.select().from(notifications).where(and(eq(notifications.userId, u))).all().filter((n) => n.message.startsWith('Reminder')).length;
    await runBookingJobs(at(MONDAY, '11:00'));
    await runBookingJobs(at(MONDAY, '11:01'));
    expect(count(c)).toBe(1);
    expect(count(provider)).toBe(1);
    await runBookingJobs(at(TUESDAY, '09:05'));
    expect(count(c)).toBe(2);
  });

  it('only the customer sees the code; the provider sees who is coming', async () => {
    const { provider, svc } = shop();
    const c = customer();
    const b = await book(c, svc.id, at(TUESDAY, '10:00'));
    expect(bookingsForCustomer(c, NOW)[0].completionCode).toBe(b.completionCode);
    const v = bookingsForProvider(provider)[0];
    expect(v.completionCode).toBe('');
    expect(v.customerPhone).toBeTruthy();
  });

  it('a service with upcoming bookings is paused rather than deleted', async () => {
    const { provider, svc } = shop();
    await book(customer(), svc.id, at(TUESDAY, '10:00'));
    expect(deleteService(provider, svc.id)).toEqual({ deleted: false, paused: true });
  });
});

describe('API', () => {
  it('lists a store\'s services, books as the signed-in customer and lets only the provider act', async () => {
    const { provider, svc } = shop();
    const res = await servicesApi(new Request('http://test.local/api/services'));
    const listed = (await res.json()).providers.find((p: any) => p.id === provider);
    expect(listed.services.map((s: any) => s.id)).toEqual([svc.id]);

    signInAs(null);
    expect((await bookApi(jsonRequest('POST', { serviceId: svc.id }))).status).toBe(401);
    const c = customer();
    signInAs(c);
    const slot = availableSlots(svc.id, lagosDate(Date.now() + 2 * 86400_000))[0] ?? availableSlots(svc.id, lagosDate(Date.now() + 3 * 86400_000))[0];
    const created = await bookApi(jsonRequest('POST', { serviceId: svc.id, startsAt: slot.startsAt }));
    expect(created.status).toBe(201);
    const { booking } = await created.json();
    expect(await providerAction(jsonRequest('POST', { action: 'cancel' }), params({ bookingId: booking.id })).then((r) => r.status)).toBe(403);
    signInAs(provider);
    expect((await providerAction(jsonRequest('POST', { action: 'cancel' }), params({ bookingId: booking.id }))).status).toBe(200);
  });

  it('unverified providers can\'t add services', async () => {
    const v = makeProvider('pending');
    signInAs(v);
    expect((await addService(jsonRequest('POST', { name: 'Braids', price: 8000, durationMin: 120, location: 'shop' }))).status).toBe(403);
  });

  it('the rules are written down as a state machine', () => {
    expect(bookingMachine.can('Requested', 'Confirmed', 'provider')).toBe(true);
    expect(bookingMachine.can('Completed', 'Cancelled', 'admin')).toBe(false);
    expect(BookingError).toBeDefined();
  });
});
