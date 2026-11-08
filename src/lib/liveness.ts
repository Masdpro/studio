/**
 * Live selfie check (delivery agents): the moves we ask for, and how we recognise each one from
 * the face points the camera model gives us. Pure functions only, so the browser and the tests
 * share exactly the same rules.
 *
 * The camera model (MediaPipe Face Landmarker) returns 478 points with x/y between 0 and 1 in the
 * raw (not mirrored) camera picture. We only compare points along the same axis, so the picture's
 * shape does not matter.
 */

export const LIVENESS_STEPS = ['turn_left', 'turn_right', 'nod', 'open_mouth', 'blink'] as const;
export type LivenessStep = (typeof LIVENESS_STEPS)[number];

export const STEP_PROMPTS: Record<LivenessStep, string> = {
  turn_left: 'Slowly turn your head to your left',
  turn_right: 'Slowly turn your head to your right',
  nod: 'Nod your head: down, then back up',
  open_mouth: 'Open your mouth wide',
  blink: 'Blink both eyes',
};

/** How many moves one check asks for. */
export const STEPS_PER_CHECK = 3;
/** Time allowed to finish a check once it starts. */
export const CHECK_TTL_MS = 10 * 60 * 1000;
/** Time allowed for a single move before the check gives up and offers a retry. */
export const STEP_TIMEOUT_MS = 20_000;

export function isLivenessStep(v: unknown): v is LivenessStep {
  return typeof v === 'string' && (LIVENESS_STEPS as readonly string[]).includes(v);
}

/**
 * Picks the moves for one check in a random order (always at least one head turn, so a flat
 * photo held up to the camera can't pass). `rand(n)` must return a whole number from 0 to n-1.
 */
export function pickSteps(rand: (n: number) => number): LivenessStep[] {
  const turns: LivenessStep[] = ['turn_left', 'turn_right'];
  const first = turns[rand(2)];
  const rest = LIVENESS_STEPS.filter((s) => s !== first);
  const picked: LivenessStep[] = [first];
  while (picked.length < STEPS_PER_CHECK) {
    const s = rest.splice(rand(rest.length), 1)[0];
    picked.push(s);
  }
  // Shuffle so the turn is not always first.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

export type Point = { x: number; y: number };
export type Blendshapes = Partial<Record<'jawOpen' | 'eyeBlinkLeft' | 'eyeBlinkRight', number>>;

/** What we read off one camera frame. */
export type FaceMetrics = {
  /** Where the nose tip sits between the two sides of the face (0.5 = facing the camera). Grows when the person turns to their left. */
  yaw: number;
  /** Where the nose tip sits between forehead and chin. Changes when the person nods. */
  pitch: number;
  /** How open the mouth is, 0 (closed) to 1 (wide open). */
  mouth: number;
  /** How closed the eyes are, 0 (open) to 1 (closed). */
  blink: number;
  /** Face width as a share of the picture width. */
  size: number;
  /** Face centre, 0..1 in the picture. */
  cx: number;
  cy: number;
};

// Face mesh point numbers.
const NOSE_TIP = 1;
const FACE_SIDE_A = 234; // the person's right cheek edge (left side of the raw picture)
const FACE_SIDE_B = 454; // the person's left cheek edge
const FOREHEAD = 10;
const CHIN = 152;
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const EYE_R = { top: 159, bottom: 145, inner: 133, outer: 33 };
const EYE_L = { top: 386, bottom: 374, inner: 362, outer: 263 };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function metricsFromLandmarks(lm: Point[], shapes?: Blendshapes): FaceMetrics | null {
  if (!lm || lm.length < 455) return null;
  const a = lm[FACE_SIDE_A];
  const b = lm[FACE_SIDE_B];
  const nose = lm[NOSE_TIP];
  const top = lm[FOREHEAD];
  const chin = lm[CHIN];
  const width = b.x - a.x;
  const height = chin.y - top.y;
  if (width <= 0.01 || height <= 0.01) return null;

  // Mouth: prefer the model's own "jaw open" score; fall back to the lip gap.
  const lipGap = (lm[LOWER_LIP].y - lm[UPPER_LIP].y) / height;
  const mouth = shapes?.jawOpen ?? clamp01(lipGap / 0.25);

  // Eyes: prefer the model's blink scores; fall back to how tall the eye opening is.
  let blink: number;
  if (shapes?.eyeBlinkLeft !== undefined && shapes?.eyeBlinkRight !== undefined) {
    blink = Math.min(shapes.eyeBlinkLeft, shapes.eyeBlinkRight);
  } else {
    const ear = (e: typeof EYE_R) => dist(lm[e.top], lm[e.bottom]) / Math.max(1e-6, dist(lm[e.inner], lm[e.outer]));
    const open = (ear(EYE_R) + ear(EYE_L)) / 2; // ~0.28 open, ~0.08 closed
    blink = clamp01((0.28 - open) / 0.2);
  }

  return {
    yaw: (nose.x - a.x) / width,
    pitch: (nose.y - top.y) / height,
    mouth,
    blink,
    size: width,
    cx: (a.x + b.x) / 2,
    cy: (top.y + chin.y) / 2,
  };
}

/** Advice for getting into position, or null when the face is well placed. */
export function framingHint(m: FaceMetrics | null, faces: number): string | null {
  if (faces === 0 || !m) return 'Put your face inside the oval';
  if (faces > 1) return 'Only one face should be in view';
  // Phones show only the middle of the camera picture inside the oval, so a face that fills the
  // oval covers roughly a quarter to a half of the full picture's width.
  if (m.size < 0.15) return 'Move a little closer';
  if (m.size > 0.75) return 'Move back a little';
  if (m.cx < 0.3 || m.cx > 0.7 || m.cy < 0.25 || m.cy > 0.75) return 'Centre your face in the oval';
  return null;
}

/** Facing the camera with eyes open and mouth closed: the moment we take the main selfie. */
export function isNeutral(m: FaceMetrics): boolean {
  return Math.abs(m.yaw - 0.5) < 0.09 && m.mouth < 0.25 && m.blink < 0.4;
}

export type StepUpdate = {
  done: boolean;
  /** True on the frame that best shows the move: the photo we keep for review. */
  capture?: boolean;
  hint?: string;
};

// Thresholds, measured from the person's own straight-on pose so faces of any shape work.
export const TURN_DELTA = 0.15;
export const NOD_DELTA = 0.06;
export const MOUTH_OPEN = 0.45;
export const BLINK_CLOSED = 0.5;
export const BLINK_OPEN = 0.3;
const HOLD_MS = 250;

/**
 * Watches the frames for one move and says when it has happened. `baseline` is the straight-on
 * pose captured at the start, so "turn left" means "turned left from how you normally sit".
 */
export function createStepDetector(step: LivenessStep, baseline: FaceMetrics) {
  let heldSince: number | null = null;
  let phase = 0;
  let peak = 0;
  let closedAt = 0;

  const hold = (ok: boolean, t: number): StepUpdate => {
    if (!ok) {
      heldSince = null;
      return { done: false };
    }
    if (heldSince === null) heldSince = t;
    const done = t - heldSince >= HOLD_MS;
    return { done, capture: done };
  };

  return (m: FaceMetrics, t: number): StepUpdate => {
    switch (step) {
      case 'turn_left':
      case 'turn_right': {
        const d = m.yaw - baseline.yaw;
        const wanted = step === 'turn_left' ? d : -d;
        if (wanted < -TURN_DELTA) return { done: false, hint: step === 'turn_left' ? 'Other way: turn to your left' : 'Other way: turn to your right' };
        return hold(wanted > TURN_DELTA, t);
      }
      case 'open_mouth':
        return hold(m.mouth > MOUTH_OPEN, t);
      case 'nod': {
        const d = Math.abs(m.pitch - baseline.pitch);
        if (phase === 0) {
          if (d > NOD_DELTA) {
            phase = 1;
            peak = d;
            return { done: false, capture: true };
          }
          return { done: false };
        }
        // Keep the photo at the deepest point of the nod, then wait for the head to come back.
        if (d > peak) {
          peak = d;
          return { done: false, capture: true };
        }
        if (d < NOD_DELTA / 2) return { done: true };
        return { done: false, hint: 'Now bring your head back up' };
      }
      case 'blink': {
        if (phase === 0) {
          if (m.blink > BLINK_CLOSED) {
            phase = 1;
            closedAt = t;
            return { done: false, capture: true };
          }
          return { done: false };
        }
        if (m.blink < BLINK_OPEN) {
          // A real blink is quick; eyes held shut for ages (or a photo with closed eyes) start over.
          if (t - closedAt < 1500) return { done: true };
          phase = 0;
        }
        return { done: false };
      }
    }
  };
}
