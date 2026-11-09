import { NextResponse } from 'next/server';
import { turnstileEnabled, turnstileSiteKey } from '@/lib/turnstile';

export const dynamic = 'force-dynamic';

/** GET — the public Turnstile site key, or null when the check is switched off. */
export async function GET() {
  return NextResponse.json({ siteKey: turnstileEnabled() ? turnstileSiteKey() : null });
}
