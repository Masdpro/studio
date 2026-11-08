/**
 * Live selfie check: the move rules (pure) and the server's start → complete flow.
 */
import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { livenessChecks, users, verificationDocuments } from '@/db/schema';
import {
  LIVENESS_STEPS,
  STEPS_PER_CHECK,
  createStepDetector,
  framingHint,
  isNeutral,
  metricsFromLandmarks,
  pickSteps,
  type FaceMetrics,
  type Point,
} from '@/lib/liveness';
import { completeLivenessCheck, latestPassedCheck, liveCheckFrame, startLivenessCheck } from '@/lib/services/liveness';
import { POST as startRoute } from '@/app/api/account/liveness/route';
import { POST as completeRoute } from '@/app/api/account/liveness/[id]/route';
import { POST as uploadDocument } from '@/app/api/account/documents/route';
import { makeAgent, makeVendor, signInAs } from './helpers';

// ---------- move rules ----------

/** A face of 478 points facing the camera, with a few points we can move. */
function face(opts: { noseX?: number; noseY?: number; lipGap?: number } = {}): Point[] {
  const lm: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  lm[234] = { x: 0.35, y: 0.5 }; // one cheek edge
  lm[454] = { x: 0.65, y: 0.5 }; // other cheek edge
  lm[10] = { x: 0.5, y: 0.3 }; // forehead
  lm[152] = { x: 0.5, y: 0.7 }; // chin
  lm[1] = { x: opts.noseX ?? 0.5, y: opts.noseY ?? 0.5 }; // nose tip
  lm[13] = { x: 0.5, y: 0.6 };
  lm[14] = { x: 0.5, y: 0.6 + (opts.lipGap ?? 0) };
  return lm;
}
const base = metricsFromLandmarks(face(), { jawOpen: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0 })!;
const m = (over: Partial<FaceMetrics>): FaceMetrics => ({ ...base, ...over });

/** Feeds frames 50 ms apart and returns whether the move counted. */
function play(step: Parameters<typeof createStepDetector>[0], frames: Partial<FaceMetrics>[]) {
  const detect = createStepDetector(step, base);
  let done = false;
  let captured = false;
  frames.forEach((f, i) => {
    const u = detect(m(f), i * 50);
    done ||= u.done;
    captured ||= !!u.capture;
  });
  return { done, captured };
}
const repeat = (f: Partial<FaceMetrics>, n: number) => Array.from({ length: n }, () => f);

describe('pickSteps', () => {
  it('asks for three different moves, always including a head turn', () => {
    for (let seed = 0; seed < 200; seed++) {
      let s = seed;
      const rand = (n: number) => (s = (s * 1103515245 + 12345) % 2147483648) % n;
      const steps = pickSteps(rand);
      expect(steps).toHaveLength(STEPS_PER_CHECK);
      expect(new Set(steps).size).toBe(STEPS_PER_CHECK);
      expect(steps.every((x) => (LIVENESS_STEPS as readonly string[]).includes(x))).toBe(true);
      expect(steps.some((x) => x === 'turn_left' || x === 'turn_right')).toBe(true);
    }
  });
});

describe('reading a face', () => {
  it('a face looking straight ahead is centred and neutral', () => {
    expect(base.yaw).toBeCloseTo(0.5);
    expect(base.pitch).toBeCloseTo(0.5);
    expect(framingHint(base, 1)).toBeNull();
    expect(isNeutral(base)).toBe(true);
  });
  it('nose moving across the face changes the turn reading', () => {
    expect(metricsFromLandmarks(face({ noseX: 0.6 }))!.yaw).toBeGreaterThan(0.8);
  });
  it('falls back to the lip gap when the model gives no mouth score', () => {
    expect(metricsFromLandmarks(face({ lipGap: 0.08 }))!.mouth).toBeGreaterThan(0.6);
    expect(metricsFromLandmarks(face())!.mouth).toBe(0);
  });
  it('gives framing advice', () => {
    expect(framingHint(null, 0)).toMatch(/oval/);
    expect(framingHint(base, 2)).toMatch(/one face/);
    expect(framingHint(m({ size: 0.1 }), 1)).toMatch(/closer/);
    expect(framingHint(m({ size: 0.9 }), 1)).toMatch(/back/);
    expect(framingHint(m({ cx: 0.9 }), 1)).toMatch(/Centre/);
  });
});

describe('move detection', () => {
  it('turn left counts once held, and the photo is taken then', () => {
    expect(play('turn_left', repeat({ yaw: 0.72 }, 8))).toEqual({ done: true, captured: true });
  });
  it('a flick that is not held does not count', () => {
    expect(play('turn_left', [{ yaw: 0.72 }, { yaw: 0.5 }, { yaw: 0.72 }, { yaw: 0.5 }]).done).toBe(false);
  });
  it('turning the wrong way does not count and says so', () => {
    const detect = createStepDetector('turn_left', base);
    const u = detect(m({ yaw: 0.28 }), 0);
    expect(u.done).toBe(false);
    expect(u.hint).toMatch(/left/);
    expect(play('turn_right', repeat({ yaw: 0.72 }, 10)).done).toBe(false);
    expect(play('turn_right', repeat({ yaw: 0.28 }, 10)).done).toBe(true);
  });
  it('open mouth counts when held open', () => {
    expect(play('open_mouth', repeat({ mouth: 0.7 }, 8)).done).toBe(true);
    expect(play('open_mouth', repeat({ mouth: 0.2 }, 20)).done).toBe(false);
  });
  it('nod needs the head to go and come back', () => {
    expect(play('nod', [...repeat({ pitch: 0.6 }, 4), ...repeat({ pitch: 0.5 }, 2)])).toEqual({ done: true, captured: true });
    expect(play('nod', repeat({ pitch: 0.6 }, 20)).done).toBe(false); // head left down
    expect(play('nod', repeat({ pitch: 0.52 }, 20)).done).toBe(false); // too small
  });
  it('blink needs eyes to close and open again quickly', () => {
    expect(play('blink', [{ blink: 0 }, { blink: 0.9 }, { blink: 0.9 }, { blink: 0.1 }]).done).toBe(true);
    expect(play('blink', [{ blink: 0.9 }, ...repeat({ blink: 0.9 }, 40), { blink: 0.1 }]).done).toBe(false); // eyes held shut 2 s
    expect(play('blink', repeat({ blink: 0 }, 20)).done).toBe(false);
  });
});

// ---------- server ----------

const jpg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(200)]);
const later = (ms: number) => new Date(Date.now() + ms);

function formWith(neutral: Buffer | null, moves: Buffer[]) {
  const f = new FormData();
  if (neutral) f.append('neutral', new Blob([new Uint8Array(neutral)], { type: 'image/jpeg' }), 'n.jpg');
  moves.forEach((b, i) => f.append(`move${i}`, new Blob([new Uint8Array(b)], { type: 'image/jpeg' }), `m${i}.jpg`));
  return new Request('http://test/api', { method: 'POST', body: f });
}
const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('live check on the server', () => {
  it('start → complete saves the selfie, the review photos, and is single use', async () => {
    const agent = makeAgent('pending');
    const { id, steps } = startLivenessCheck(agent);
    expect(steps).toHaveLength(STEPS_PER_CHECK);

    const result = await completeLivenessCheck(agent, id, jpg(), steps.map(jpg), later(8000));
    const doc = db.select().from(verificationDocuments).where(and(eq(verificationDocuments.userId, agent), eq(verificationDocuments.kind, 'selfie'))).get();
    expect(doc?.id).toBe(result.documentId);
    expect(latestPassedCheck(agent)).toMatchObject({ id, frameCount: STEPS_PER_CHECK + 1 });

    await expect(completeLivenessCheck(agent, id, jpg(), steps.map(jpg), later(9000))).rejects.toMatchObject({ status: 409 });
  });

  it('a new check replaces the old selfie document', async () => {
    const agent = makeAgent('pending');
    for (let i = 0; i < 2; i++) {
      const { id, steps } = startLivenessCheck(agent);
      await completeLivenessCheck(agent, id, jpg(), steps.map(jpg), later(8000));
    }
    const docs = db.select().from(verificationDocuments).where(and(eq(verificationDocuments.userId, agent), eq(verificationDocuments.kind, 'selfie'))).all();
    expect(docs).toHaveLength(1);
  });

  it('refuses: too quick, expired, wrong owner, wrong photo count, repeated photo, not an image', async () => {
    const agent = makeAgent('pending');
    const other = makeAgent('pending');
    const start = () => startLivenessCheck(agent);

    let c = start();
    await expect(completeLivenessCheck(agent, c.id, jpg(), c.steps.map(jpg), later(500))).rejects.toMatchObject({ status: 400 });
    c = start();
    await expect(completeLivenessCheck(agent, c.id, jpg(), c.steps.map(jpg), later(11 * 60 * 1000))).rejects.toMatchObject({ status: 410 });
    c = start();
    await expect(completeLivenessCheck(other, c.id, jpg(), c.steps.map(jpg), later(8000))).rejects.toMatchObject({ status: 404 });
    c = start();
    await expect(completeLivenessCheck(agent, c.id, jpg(), [jpg()], later(8000))).rejects.toMatchObject({ status: 400 });
    c = start();
    const same = jpg();
    await expect(completeLivenessCheck(agent, c.id, same, c.steps.map(() => same), later(8000))).rejects.toMatchObject({ status: 400 });
    c = start();
    await expect(completeLivenessCheck(agent, c.id, Buffer.from('not an image at all'), c.steps.map(jpg), later(8000))).rejects.toMatchObject({ status: 415 });

    // None of the refused tries left a selfie behind.
    expect(db.select().from(verificationDocuments).where(eq(verificationDocuments.userId, agent)).all()).toHaveLength(0);
  });

  it('redoing the check after being sent back puts the account back in the queue', async () => {
    const agent = makeAgent('rejected');
    const { id, steps } = startLivenessCheck(agent);
    await completeLivenessCheck(agent, id, jpg(), steps.map(jpg), later(8000));
    expect(db.select().from(users).where(eq(users.id, agent)).get()?.approvalStatus).toBe('pending');
  });

  it('review photos are visible to the agent and admins only', async () => {
    const agent = makeAgent('pending');
    const { id, steps } = startLivenessCheck(agent);
    await completeLivenessCheck(agent, id, jpg(), steps.map(jpg), later(8000));
    expect(liveCheckFrame(id, 0, { id: agent })).toBeTruthy();
    expect(liveCheckFrame(id, 0, { id: 'someone-else', role: 'admin' })).toBeTruthy();
    expect(liveCheckFrame(id, 0, { id: 'someone-else', role: 'customer' })).toBeNull();
    expect(liveCheckFrame(id, 99, { id: agent })).toBeNull();
  });
});

describe('live check routes', () => {
  it('vendors are not asked for a live selfie', async () => {
    signInAs(makeVendor());
    expect((await startRoute()).status).toBe(403);
  });

  it('agents start a check, and a check finished after a real pause passes', async () => {
    const agent = makeAgent('pending');
    signInAs(agent);
    const res = await startRoute();
    expect(res.status).toBe(201);
    const { id, steps } = await res.json();

    // Straight away is too quick for a person…
    expect((await completeRoute(formWith(jpg(), steps.map(jpg)), routeParams(id))).status).toBe(400);

    // …but after a few seconds it passes. (Backdate the start rather than waiting.)
    const again = await (await startRoute()).json();
    db.update(livenessChecks).set({ createdAt: new Date(Date.now() - 10_000) }).where(eq(livenessChecks.id, again.id)).run();
    const done = await completeRoute(formWith(jpg(), again.steps.map(jpg)), routeParams(again.id));
    expect(done.status).toBe(201);
  });

  it('a selfie can no longer be uploaded as a file', async () => {
    signInAs(makeAgent('pending'));
    const f = new FormData();
    f.append('kind', 'selfie');
    f.append('file', new Blob([new Uint8Array(jpg())], { type: 'image/jpeg' }), 'me.jpg');
    const res = await uploadDocument(new Request('http://test/api', { method: 'POST', body: f }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/live selfie/);
  });
});
