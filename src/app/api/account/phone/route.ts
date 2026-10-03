import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { confirmPhoneCode, normalizeNigerianPhone, sendPhoneCode } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';

/** POST { action: 'send', phone } texts a code; POST { action: 'verify', code } checks it. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string };

  if (body.action === 'send') {
    const phone = body.phone ? normalizeNigerianPhone(body.phone) : null;
    if (!phone) return NextResponse.json({ error: 'Enter a valid Nigerian mobile number, e.g. 08012345678.' }, { status: 400 });
    const result = await sendPhoneCode(session.user.id, phone);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
    return NextResponse.json({ ok: true, phone, devCode: exposeDevCodes ? result.devCode : undefined });
  }

  if (body.action === 'verify') {
    if (!body.code || !/^\d{6}$/.test(body.code.trim())) {
      return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
    }
    const result = confirmPhoneCode(session.user.id, body.code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
