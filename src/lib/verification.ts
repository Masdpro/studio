import { getUserRoles } from '@/lib/roles';
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, verificationCodes, verificationDocuments } from '@/db/schema';
import { sendEmail, sendSms } from '@/lib/notify';
import { renderEmail } from '@/lib/email-template';

export type DocumentKind = 'business_proof' | 'store_photo' | 'government_id' | 'selfie';

export const REQUIRED_DOCUMENTS: Record<string, DocumentKind[]> = {
  vendor: ['business_proof', 'store_photo'],
  delivery_agent: ['government_id', 'selfie'],
};

export function requiredDocumentsFor(userId: string): DocumentKind[] {
  const roles = getUserRoles(userId);
  return Array.from(new Set(roles.flatMap((r) => REQUIRED_DOCUMENTS[r] ?? [])));
}

/** Called when an existing account adds a vendor / agent profile: records the phone and, for a first trading role, queues it for admin approval. */
export function startTradingRole(userId: string, phone: unknown, alreadyTrading: boolean) {
  const normalized = typeof phone === 'string' ? normalizeNigerianPhone(phone) : null;
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return;
  const patch: Record<string, unknown> = {};
  if (normalized && normalized !== user.phone) { patch.phone = normalized; patch.phoneVerifiedAt = null; }
  if (!alreadyTrading && user.role !== 'admin') patch.approvalStatus = 'pending';
  if (Object.keys(patch).length) db.update(users).set(patch).where(eq(users.id, userId)).run();
}

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  business_proof: 'Business registration (CAC certificate, business permit or similar)',
  store_photo: 'Photo of your store or stall',
  government_id: 'Government ID (NIN slip, driver\'s licence, voter\'s card or passport)',
  selfie: 'A clear selfie of your face',
};

const EMAIL_TTL_MS = 30 * 60 * 1000;
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

function recentCode(userId: string, channel: 'email' | 'phone' | 'password_reset') {
  return db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, channel)))
    .all()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

/** Emails the user a fresh 6-digit confirmation code (valid 30 minutes). Returns the code for dev display. */
export async function sendEmailVerification(userId: string): Promise<{ code: string } | { error: string; retryInSeconds: number }> {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { error: 'Unknown user.', retryInSeconds: 0 };

  const last = recentCode(userId, 'email');
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { error: 'Please wait a minute before asking for another code.', retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000) };
  }
  // Wrong guesses carry over to the next code for an hour, so asking for fresh codes cannot reset the limit.
  const carried = last && Date.now() - last.createdAt.getTime() < HOUR_MS ? last.attempts : 0;

  db.delete(verificationCodes).where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, 'email'))).run();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  db.insert(verificationCodes)
    .values({ id: randomUUID(), userId, channel: 'email', target: user.email, codeHash: sha256(code), attempts: carried, expiresAt: new Date(Date.now() + EMAIL_TTL_MS), createdAt: new Date() })
    .run();

  await sendEmail(
    user.email,
    `${code} is your Closebuy confirmation code`,
    renderEmail({
      greetingName: user.displayName,
      intro: ['Welcome to Closebuy! Enter this code on the confirmation page to activate your account.'],
      code,
      codeNote: 'The code expires in 30 minutes.',
      outro: ["Didn't sign up for Closebuy? You can ignore this email. Never share this code with anyone."],
    }),
  );
  return { code };
}

/**
 * Checks an emailed code for the account with this address. Errors are the same whether
 * or not the address has an account, so this can't be used to discover who has signed up.
 */
export function confirmEmailCode(email: string, code: string): { ok: boolean; error?: string } {
  const generic = 'That code is not right or has expired. Check the latest email or ask for a new code.';
  const user = db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
  if (!user) return { ok: false, error: generic };
  if (user.emailVerifiedAt) return { ok: true };
  const row = recentCode(user.id, 'email');
  if (!row || row.expiresAt.getTime() < Date.now()) return { ok: false, error: generic };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong attempts. Wait an hour, then ask for a new code.' };
  if (!safeEqual(row.codeHash, sha256(code.trim()))) {
    db.update(verificationCodes).set({ attempts: row.attempts + 1 }).where(eq(verificationCodes.id, row.id)).run();
    return { ok: false, error: generic };
  }
  db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id)).run();
  db.delete(verificationCodes).where(eq(verificationCodes.id, row.id)).run();
  return { ok: true };
}

/** Marks the email verified from a link sent before the switch to codes (kept so those links still work). */
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
  const roles = getUserRoles(userId);
  const required = requiredDocumentsFor(userId);
  const submitted = new Set(documents.map((d) => d.kind));
  const needsReview = roles.includes('vendor') || roles.includes('delivery_agent');
  const documentsComplete = required.every((k) => submitted.has(k));
  return {
    role: roles.includes('vendor') ? 'vendor' : roles.includes('delivery_agent') ? 'delivery_agent' : user.role,
    roles,
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
    readyForReview: !needsReview ? true : !!user.emailVerifiedAt && !!user.phoneVerifiedAt && documentsComplete,
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

const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * "Forgot password": emails a one-hour reset link. Says nothing about whether
 * the address has an account; callers always show the same reply.
 */
export async function sendPasswordReset(email: string): Promise<{ link?: string }> {
  const user = db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
  if (!user) return {};
  const last = recentCode(user.id, 'password_reset');
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) return {};

  db.delete(verificationCodes).where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.channel, 'password_reset'))).run();
  const token = randomBytes(32).toString('hex');
  db.insert(verificationCodes)
    .values({ id: randomUUID(), userId: user.id, channel: 'password_reset', target: user.email, codeHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS), createdAt: new Date() })
    .run();
  const link = `${appUrl()}/auth/reset-password?token=${token}&uid=${encodeURIComponent(user.id)}`;
  await sendEmail(
    user.email,
    'Reset your Closebuy password',
    renderEmail({
      greetingName: user.displayName,
      intro: ['Someone (hopefully you) asked to reset your Closebuy password. Tap the button below within an hour to choose a new one.'],
      button: { label: 'Choose a new password', url: link },
      outro: ["If this wasn't you, ignore this email; your password stays the same."],
    }),
  );
  return { link };
}

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Emails a new admin a link (valid 3 days) to choose their own password. Uses the same
 * one-time-link mechanism as password resets; any earlier unused link stops working.
 */
export async function sendAdminInvite(userId: string, invitedBy: string): Promise<{ link: string } | null> {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;
  db.delete(verificationCodes).where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.channel, 'password_reset'))).run();
  const token = randomBytes(32).toString('hex');
  db.insert(verificationCodes)
    .values({ id: randomUUID(), userId: user.id, channel: 'password_reset', target: user.email, codeHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), createdAt: new Date() })
    .run();
  const link = `${appUrl()}/auth/reset-password?token=${token}&uid=${encodeURIComponent(user.id)}&invite=1`;
  await sendEmail(
    user.email,
    "You've been added as a Closebuy admin",
    renderEmail({
      greetingName: user.displayName,
      intro: [`${invitedBy} has added you as an admin on Closebuy. Tap the button below within 3 days to choose your password, then sign in with this email address.`],
      button: { label: 'Set up my admin account', url: link },
      outro: ["If you weren't expecting this, ignore this email."],
    }),
  );
  return { link };
}

/** Sets a new password from a reset link, then signs the account out everywhere. */
export async function resetPasswordWithToken(userId: string, token: string, passwordHash: string): Promise<boolean> {
  const row = recentCode(userId, 'password_reset');
  if (!row || row.expiresAt.getTime() < Date.now() || !safeEqual(row.codeHash, sha256(token))) return false;
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return false;
  db.update(users)
    .set({ passwordHash, sessionVersion: (user.sessionVersion ?? 0) + 1, emailVerifiedAt: user.emailVerifiedAt ?? new Date() })
    .where(eq(users.id, userId))
    .run();
  db.delete(verificationCodes).where(eq(verificationCodes.id, row.id)).run();
  await sendEmail(
    user.email,
    'Your Closebuy password was changed',
    renderEmail({
      greetingName: user.displayName,
      intro: ['Your password was just reset and every device was signed out.'],
      outro: ["If this wasn't you, reset it again right away and contact support@cbuyapp.com."],
    }),
  );
  return true;
}
