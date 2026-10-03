import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sendEmailVerification } from '@/lib/verification';
import { exposeDevCodes } from '@/lib/notify';

/** Always answers the same way so it can't be used to discover which emails have accounts. */
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const user = email ? db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get() : null;
  let devLink: string | undefined;
  if (user && !user.emailVerifiedAt) {
    const sent = await sendEmailVerification(user.id);
    if (exposeDevCodes && 'link' in sent) devLink = sent.link;
  }
  return NextResponse.json({ ok: true, devLink });
}
