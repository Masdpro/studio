/**
 * Cloudflare Turnstile — a mostly invisible "are you a person?" check on sign-up and
 * forgot-password, so bots can't use them to probe which emails have accounts or to flood
 * inboxes.
 *
 * Both keys are read at runtime (no rebuild needed to switch it on or off):
 *   TURNSTILE_SITE_KEY    — public; sent to the browser to draw the widget.
 *   TURNSTILE_SECRET_KEY  — private; used here to check the browser's token with Cloudflare.
 * The check is on only when BOTH are set. With either missing it is skipped, so local
 * development and tests work without Cloudflare.
 */
import { log } from '@/lib/log';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY?.trim() || null;
}

export function turnstileEnabled(): boolean {
  return !!(turnstileSiteKey() && process.env.TURNSTILE_SECRET_KEY?.trim());
}

export type TurnstileResult = { ok: true } | { ok: false; error: string };

/**
 * Checks a browser's Turnstile token with Cloudflare. Tokens are single use and expire
 * after five minutes. If Cloudflare itself can't be reached, the request is let through
 * (the per-IP rate limits still apply) rather than locking everyone out of sign-up.
 */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<TurnstileResult> {
  if (!turnstileEnabled()) return { ok: true };
  if (typeof token !== 'string' || !token || token.length > 2048) {
    return { ok: false, error: 'Please complete the security check and try again.' };
  }
  const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!.trim(), response: token });
  if (ip && ip !== 'unknown') form.set('remoteip', ip);
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    log.info('Bot check rejected a request', { area: 'security', codes: (data['error-codes'] ?? []).join(',') });
    return { ok: false, error: 'The security check failed or expired. Please try again.' };
  } catch (err) {
    log.warn('Could not reach Cloudflare for the bot check; request allowed', { area: 'security', err });
    return { ok: true };
  }
}
