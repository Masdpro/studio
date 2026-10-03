import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, verificationCodes, verificationDocuments } from '@/db/schema';
import { sendEmail, sendSms } from '@/lib/notify';

export type DocumentKind = 'business_proof' | 'store_photo' | 'government_id' | 'selfie';

export const REQUIRED_DOCUMENTS: Record<string, DocumentKind[]> = {
  vendor: ['business_proof', 'store_photo'],
  delivery_agent: ['government_id', 'selfie'],
};

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  business_proof: 'Business registration (CAC certificate, business permit or similar)',
  store_photo: 'Photo of your store or stall',
  government_id: 'Government ID (NIN slip, driver\'s licence, voter\'s card or passport)',
  selfie: 'A clear selfie of your face',
};

const EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
const PHONE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const appUrl = () => process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

/** Accepts 08012345678, 8012345678, 2348012345678 or +2348012345678 and returns +2348012345678, or null. */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const m = digits.match(/^(?:234|0)?([789][01]\d{8})$/);
  return m ? `+234${m[1]}` : null;
}

function recentCode(userId: string, channel: 'email' | 'phone') {
  return db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, channel)))
    .all()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

/** Creates a fresh email verification link for the user and "sends" it. Returns the link for dev display. */
export async function sendEmailVerification(userId: string): Promise<{ link: string } | { error: string; retryInSeconds: number }> {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { error: 'Unknown user.', retryInSeconds: 0 };

  const last = recentCode(userId, 'email');
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { error: 'Please wait a minute before asking for another link.', retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000) };
  }

  db.delete(verificationCodes).where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, 'email'))).run();
  const token = randomBytes(32).toString('hex');
  db.insert(verificationCodes)
    .values({ id: randomUUID(), userId, channel: 'email', target: user.email, codeHash: sha256(token), expiresAt: new Date(Date.now() + EMAIL_TTL_MS), createdAt: new Date() })
    .run();

  const link = `${appUrl()}/api/auth/verify-email?token=${token}&uid=${encodeURIComponent(userId)}`;
  await sendEmail(user.email, 'Confirm your Closebuy email address', `Hi ${user.displayName ?? ''},\n\nConfirm your email by opening this link (valid for 24 hours):\n${link}`);
  return { link };
}

/** Marks the email verified if the link is valid. */
export function confirmEmailToken(userId: string, token: string): boolean {
  const row = recentCode(userId, 'email');
  if (!row || row.expiresAt.getTime() < Date.now() || !safeEqual(row.codeHash, sha256(token))) return false;
  db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId)).run();
  db.delete(verificationCodes).where(eq(verificationCodes.id, row.id)).run();
  return true;
}

/** Sends a 6-digit code by SMS to the given (already normalised) number. */
export async function sendPhoneCode(userId: string, phone: string): Promise<{ ok: true; devCode: string } | { ok: false; error: string }> {
  const last = recentCode(userId, 'phone');
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: 'Please wait a minute before asking for another code.' };
  }
  const taken = db.select().from(users).where(eq(users.phone, phone)).all()
    .find((u) => u.id !== userId && u.phoneVerifiedAt);
  if (taken) return { ok: false, error: 'That phone number is already verified on another account.' };

  // Wrong guesses carry over to the next code for an hour, so asking for fresh codes cannot reset the limit.
  const carried = last && Date.now() - last.createdAt.getTime() < HOUR_MS ? last.attempts : 0;
  if (carried >= MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong attempts. Try again in an hour.' };

  db.delete(verificationCodes).where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, 'phone'))).run();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  db.insert(verificationCodes)
    .values({ id: randomUUID(), userId, channel: 'phone', target: phone, codeHash: sha256(code), attempts: carried, expiresAt: new Date(Date.now() + PHONE_TTL_MS), createdAt: new Date() })
    .run();
  db.update(users).set({ phone, phoneVerifiedAt: null }).where(eq(users.id, userId)).run();
  await sendSms(phone, `Your Closebuy verification code is ${code}. It expires in 10 minutes.`);
  return { ok: true, devCode: code };
}

export function confirmPhoneCode(userId: string, code: string): { ok: boolean; error?: string } {
  const row = recentCode(userId, 'phone');
  if (!row || row.expiresAt.getTime() < Date.now()) return { ok: false, error: 'That code has expired. Ask for a new one.' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong attempts. Ask for a new code.' };
  if (!safeEqual(row.codeHash, sha256(code.trim()))) {
    db.update(verificationCodes).set({ attempts: row.attempts + 1 }).where(eq(verificationCodes.id, row.id)).run();
    return { ok: false, error: 'That code is not right.' };
  }
  db.update(users).set({ phoneVerifiedAt: new Date() }).where(eq(users.id, userId)).run();
  db.delete(verificationCodes).where(eq(verificationCodes.id, row.id)).run();
  return { ok: true };
}

export function getVerificationState(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;
  const documents = db.select().from(verificationDocuments).where(eq(verificationDocuments.userId, userId)).all();
  const required = REQUIRED_DOCUMENTS[user.role] ?? [];
  const submitted = new Set(documents.map((d) => d.kind));
  const needsReview = user.role === 'vendor' || user.role === 'delivery_agent';
  const documentsComplete = required.every((k) => submitted.has(k));
  return {
    role: user.role,
    email: user.email,
    emailVerified: !!user.emailVerifiedAt,
    phone: user.phone,
    phoneVerified: !!user.phoneVerifiedAt,
    needsReview,
    approvalStatus: user.approvalStatus,
    approvalNote: user.approvalNote,
    requiredDocuments: required.map((kind) => ({ kind, label: DOCUMENT_LABELS[kind], uploaded: submitted.has(kind), id: documents.find((d) => d.kind === kind)?.id ?? null })),
    documentsComplete,
    // Everything an admin needs before they can approve:
    readyForReview: user.role === 'customer' ? true : !!user.emailVerifiedAt && !!user.phoneVerifiedAt && documentsComplete,
    // Vendors / agents may only trade once approved.
    mayTrade: !needsReview || (user.approvalStatus === 'approved' && !!user.phoneVerifiedAt),
  };
}

/** Returns an error message if this seller / agent isn't cleared to trade yet, otherwise null. */
export function tradingBlockReason(userId: string): string | null {
  const s = getVerificationState(userId);
  if (!s) return 'Account not found.';
  if (s.mayTrade) return null;
  if (s.approvalStatus === 'rejected') return 'Your verification was not approved. Open Account verification to see why and re-submit.';
  return 'Your account is still being verified. Finish Account verification and wait for admin approval.';
}
