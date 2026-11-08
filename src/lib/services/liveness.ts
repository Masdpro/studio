import { createHash, randomInt, randomUUID } from 'crypto';
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { livenessChecks, users, verificationDocuments } from '@/db/schema';
import { CONTENT_TYPES, detectImageExtension } from '@/lib/uploads';
import { deleteFile, saveFile } from '@/lib/storage';
import { requiredDocumentsFor } from '@/lib/verification';
import { CHECK_TTL_MS, isLivenessStep, pickSteps, type LivenessStep } from '@/lib/liveness';

/**
 * Live selfie check for delivery agents.
 *
 *   start    → the server picks random moves and remembers them for 10 minutes.
 *   complete → the browser sends a straight-on photo plus one photo per move. The check is
 *              single use: it passes once, and only for the moves it asked for.
 *
 * The moves themselves are recognised in the browser (src/lib/liveness.ts); the photos of each
 * move are kept so an admin can see a real, moving face before approving the account.
 */

export class LivenessError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const MAX_FRAME_BYTES = 2 * 1024 * 1024;
/** No real person finishes a straight-on photo and three moves faster than this. */
export const MIN_CHECK_MS = 3000;
const MAX_STARTS_PER_HOUR = 15;

export function needsLiveSelfie(userId: string) {
  return requiredDocumentsFor(userId).includes('selfie');
}

export function startLivenessCheck(userId: string, now = new Date()) {
  if (!needsLiveSelfie(userId)) throw new LivenessError('Only delivery agents take the live selfie check.', 403);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = db.select().from(livenessChecks).where(and(eq(livenessChecks.userId, userId), gte(livenessChecks.createdAt, hourAgo))).all();
  if (recent.length >= MAX_STARTS_PER_HOUR) throw new LivenessError('Too many tries in the last hour. Please wait a little and try again.', 429);

  const steps = pickSteps((n) => randomInt(n));
  const id = randomUUID();
  db.insert(livenessChecks)
    .values({ id, userId, steps: JSON.stringify(steps), status: 'started', createdAt: now, expiresAt: new Date(now.getTime() + CHECK_TTL_MS) })
    .run();
  return { id, steps };
}

export async function completeLivenessCheck(userId: string, checkId: string, neutral: Buffer, moves: Buffer[], now = new Date()) {
  const check = db.select().from(livenessChecks).where(eq(livenessChecks.id, checkId)).get();
  if (!check || check.userId !== userId) throw new LivenessError('This check was not found. Start again.', 404);
  if (check.status !== 'started') throw new LivenessError('This check has already been used. Start a new one.', 409);
  if (check.expiresAt.getTime() < now.getTime()) throw new LivenessError('This check has expired. Start again.', 410);
  if (now.getTime() - check.createdAt.getTime() < MIN_CHECK_MS) throw new LivenessError('That was too quick. Please try again.', 400);

  const steps = JSON.parse(check.steps) as LivenessStep[];
  if (!steps.every(isLivenessStep) || moves.length !== steps.length) throw new LivenessError('Send one photo for each move.', 400);

  const all = [neutral, ...moves];
  const exts = all.map((buf) => {
    if (buf.length > MAX_FRAME_BYTES) throw new LivenessError('A photo was too large.', 413);
    const ext = detectImageExtension(buf);
    if (ext !== 'jpg' && ext !== 'webp' && ext !== 'png') throw new LivenessError('Photos must be JPG, PNG or WebP.', 415);
    return ext;
  });
  // The same picture sent several times is not a moving face.
  const hashes = new Set(all.map((b) => createHash('sha256').update(b).digest('hex')));
  if (hashes.size !== all.length) throw new LivenessError('The photos must all be different. Please try again.', 400);

  // Claim the check first, so two submissions can't both pass.
  const claimed = db
    .update(livenessChecks)
    .set({ status: 'passed', completedAt: now })
    .where(and(eq(livenessChecks.id, checkId), eq(livenessChecks.status, 'started')))
    .run();
  if (claimed.changes === 0) throw new LivenessError('This check has already been used. Start a new one.', 409);

  const frameNames: string[] = [];
  for (let i = 0; i < all.length; i++) {
    const name = `${randomUUID()}.${exts[i]}`;
    await saveFile('private', name, all[i], CONTENT_TYPES[exts[i]]);
    frameNames.push(name);
  }
  db.update(livenessChecks).set({ frames: JSON.stringify(frameNames) }).where(eq(livenessChecks.id, checkId)).run();

  // The straight-on photo becomes the agent's selfie document (its own copy, so replacing the
  // selfie later never removes the review photos of an earlier check).
  const selfieName = `${randomUUID()}.${exts[0]}`;
  await saveFile('private', selfieName, neutral, CONTENT_TYPES[exts[0]]);
  const old = db.select().from(verificationDocuments).where(and(eq(verificationDocuments.userId, userId), eq(verificationDocuments.kind, 'selfie'))).all();
  db.delete(verificationDocuments).where(and(eq(verificationDocuments.userId, userId), eq(verificationDocuments.kind, 'selfie'))).run();
  for (const o of old) await deleteFile('private', o.fileName);
  const documentId = randomUUID();
  db.insert(verificationDocuments).values({ id: documentId, userId, kind: 'selfie', fileName: selfieName, contentType: CONTENT_TYPES[exts[0]], createdAt: now }).run();

  // Redoing the check after being sent back puts the account back in the review queue.
  db.update(users).set({ approvalStatus: 'pending', approvalNote: null }).where(and(eq(users.id, userId), eq(users.approvalStatus, 'rejected'))).run();
  return { documentId, steps };
}

/** The agent's most recent passed check, for the admin review screen. */
export function latestPassedCheck(userId: string) {
  const c = db
    .select()
    .from(livenessChecks)
    .where(and(eq(livenessChecks.userId, userId), eq(livenessChecks.status, 'passed')))
    .orderBy(desc(livenessChecks.completedAt))
    .get();
  if (!c || !c.frames) return null;
  const frames = JSON.parse(c.frames) as string[];
  return { id: c.id, steps: JSON.parse(c.steps) as LivenessStep[], frameCount: frames.length, completedAt: c.completedAt };
}

/** File name of one review photo (0 = straight on, then one per move), if this viewer may see it. */
export function liveCheckFrame(checkId: string, index: number, viewer: { id: string; role?: string | null }) {
  const c = db.select().from(livenessChecks).where(eq(livenessChecks.id, checkId)).get();
  if (!c || !c.frames || (c.userId !== viewer.id && viewer.role !== 'admin')) return null;
  const frames = JSON.parse(c.frames) as string[];
  return Number.isInteger(index) && index >= 0 && index < frames.length ? frames[index] : null;
}
