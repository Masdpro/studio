/**
 * Logging and monitoring: structured logs saved as system events, secrets hidden, SMS/payment
 * failures recorded, request IDs on every response, the admin System health page and /api/health.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { systemEvents } from '@/db/schema';
import { flushLogs, log } from '@/lib/log';
import { eventCounts, pruneEvents, recentEvents } from '@/lib/services/system-events';
import { sendSms } from '@/lib/notify';
import { middleware } from '@/middleware';
import { GET as health } from '@/app/api/health/route';
import { GET as systemApi } from '@/app/api/admin/system/route';
import { makeUser, makeVendor, signInAs } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TERMII_API_KEY;
  delete process.env.TERMII_SENDER_ID;
});

describe('logger', () => {
  it('saves warnings and errors that have an area, with the request ID, hiding secrets', async () => {
    const req = new Request('http://x/api/y', { headers: { 'x-request-id': 'req-123' } });
    log.forRequest(req).error('Paystack said no', { area: 'payments', reference: 'wd_1', password: 'hunter2', apiKey: 'k', err: new Error('boom') });
    log.info('just info', { area: 'payments' });
    log.warn('no area, not saved');
    await flushLogs();
    const [e] = recentEvents({ area: 'payments' });
    expect(e).toMatchObject({ level: 'error', area: 'payments', message: 'Paystack said no', requestId: 'req-123' });
    expect(e.details).toMatchObject({ reference: 'wd_1', password: '[hidden]', apiKey: '[hidden]', err: { message: 'boom' } });
    expect(recentEvents().some((x) => x.message === 'just info' || x.message === 'no area, not saved')).toBe(false);
  });

  it('counts problems per area and forgets them after 30 days', async () => {
    log.warn('slow SMS', { area: 'sms' });
    await flushLogs();
    expect(eventCounts(new Date(Date.now() - 60_000)).sms.warn).toBeGreaterThan(0);
    db.insert(systemEvents).values({ at: new Date(Date.now() - 40 * 86_400_000), level: 'error', area: 'jobs', message: 'old' }).run();
    expect(pruneEvents()).toBe(1);
  });
});

describe('outside services', () => {
  it('records an SMS the provider refused, without the full phone number', async () => {
    process.env.TERMII_API_KEY = 'k';
    process.env.TERMII_SENDER_ID = 'Closebuy';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"insufficient balance"}', { status: 400 })));
    await sendSms('+2348031234567', 'Your code is 1234');
    await flushLogs();
    const [e] = recentEvents({ area: 'sms' });
    expect(e.message).toBe('Termii refused an SMS');
    expect(JSON.stringify(e.details)).not.toContain('8031234567');
    expect(JSON.stringify(e.details)).not.toContain('1234 ');
  });
});

describe('request IDs', () => {
  it('every response carries one, and Fly\'s own ID is reused', async () => {
    const res = await middleware(new NextRequest('http://localhost/shop'));
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    const fly = await middleware(new NextRequest('http://localhost/shop', { headers: { 'fly-request-id': 'fly-abc' } }));
    expect(fly.headers.get('x-request-id')).toBe('fly-abc');
  });

  it('sign-in rules still cover exactly the same pages', async () => {
    const at = async (p: string) => (await middleware(new NextRequest(`http://localhost${p}`))).headers.get('location');
    expect(await at('/wallet')).toContain('/auth/login');
    expect(await at('/admin/system')).toContain('/auth/login');
    expect(await at('/orders')).toContain('/auth/login');
    expect(await at('/orders/abc')).toBeNull(); // order tracking pages were never behind sign-in
    expect(await at('/shop')).toBeNull();
  });
});

describe('health', () => {
  it('/api/health answers for Fly and the uptime monitor', async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, database: 'ok' });
  });

  it('the System health page is for admins and shows checks and problems', async () => {
    signInAs(makeVendor());
    expect((await systemApi(new Request('http://x/api/admin/system'))).status).toBe(403);
    signInAs(makeUser({ role: 'admin' }));
    log.error('Resend refused an email', { area: 'email' });
    await flushLogs();
    const res = await systemApi(new Request('http://x/api/admin/system?area=email'));
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.checks.find((c: { id: string }) => c.id === 'database').status).toBe('ok');
    expect(d.checks.find((c: { id: string }) => c.id === 'migrations').status).toBe('ok');
    expect(d.events.every((e: { area: string }) => e.area === 'email')).toBe(true);
    expect(d.counts.day.email.error).toBeGreaterThan(0);
  });
});
