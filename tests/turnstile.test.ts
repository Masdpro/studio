/**
 * Cloudflare Turnstile on sign-up and forgot-password. Cloudflare is never contacted: the
 * siteverify call is replaced with a stub, so these check how our routes react to its answer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { GET as captchaConfig } from '@/app/api/auth/captcha/route';
import { turnstileEnabled, verifyTurnstile } from '@/lib/turnstile';

let ipCounter = 0;
/** Each request comes from a fresh IP so the per-IP rate limits never interfere. */
function post(url: string, body: unknown) {
  ipCounter += 1;
  return new Request(`http://test.local${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'fly-client-ip': `10.9.0.${ipCounter}` },
  });
}

const realFetch = globalThis.fetch;
let siteverify: ReturnType<typeof vi.fn>;

function switchOn() {
  process.env.TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
  process.env.TURNSTILE_SECRET_KEY = 'unit-test-turnstile-secret';
}

beforeEach(() => {
  siteverify = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
  globalThis.fetch = siteverify as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe('turnstile switched off (no keys)', () => {
  it('is skipped, so local development and tests need no Cloudflare', async () => {
    expect(turnstileEnabled()).toBe(false);
    expect(await verifyTurnstile(undefined)).toEqual({ ok: true });
    expect(siteverify).not.toHaveBeenCalled();
    expect(await (await captchaConfig()).json()).toEqual({ siteKey: null });
  });

  it('needs both keys: a secret without a site key does not lock everyone out', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'x';
    expect(turnstileEnabled()).toBe(false);
  });

  it('lets sign-up through without a token', async () => {
    const res = await register(post('/api/auth/register', { email: `t${Date.now()}@example.com`, password: 'Password123', role: 'customer' }));
    expect(res.status).toBe(201);
  });
});

describe('turnstile switched on', () => {
  beforeEach(switchOn);

  it('gives the browser the public site key, never the secret', async () => {
    const body = await (await captchaConfig()).text();
    expect(JSON.parse(body)).toEqual({ siteKey: '1x00000000000000000000AA' });
    expect(body).not.toContain('unit-test-turnstile-secret');
  });

  it('refuses sign-up with no token, before touching the database or Cloudflare', async () => {
    const res = await register(post('/api/auth/register', { email: 'no-token@example.com', password: 'Password123', role: 'customer' }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CAPTCHA_FAILED');
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('refuses sign-up when Cloudflare rejects the token — so it cannot reveal existing accounts', async () => {
    siteverify.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })));
    const res = await register(post('/api/auth/register', { email: 'x@example.com', password: 'Password123', role: 'customer', turnstileToken: 'bad' }));
    expect(res.status).toBe(403);
  });

  it('accepts sign-up with a good token, sending the secret, token and IP to Cloudflare', async () => {
    const res = await register(post('/api/auth/register', { email: `ok${Date.now()}@example.com`, password: 'Password123', role: 'customer', turnstileToken: 'good-token' }));
    expect(res.status).toBe(201);
    const [url, init] = siteverify.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = new URLSearchParams(init.body as URLSearchParams);
    expect(sent.get('secret')).toBe('unit-test-turnstile-secret');
    expect(sent.get('response')).toBe('good-token');
    expect(sent.get('remoteip')).toMatch(/^10\.9\.0\./);
  });

  it('guards forgot-password the same way', async () => {
    expect((await forgot(post('/api/auth/forgot-password', { email: 'a@example.com' }))).status).toBe(403);
    expect((await forgot(post('/api/auth/forgot-password', { email: 'a@example.com', turnstileToken: 'good' }))).status).toBe(200);
  });

  it('lets requests through if Cloudflare is unreachable (rate limits still apply)', async () => {
    siteverify.mockRejectedValueOnce(new Error('network down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await verifyTurnstile('any', '1.2.3.4')).toEqual({ ok: true });
    spy.mockRestore();
  });
});
