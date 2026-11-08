'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CheckCircle2, Loader2, RotateCcw, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  STEP_PROMPTS,
  STEP_TIMEOUT_MS,
  createStepDetector,
  framingHint,
  isNeutral,
  metricsFromLandmarks,
  type Blendshapes,
  type FaceMetrics,
  type LivenessStep,
  type StepUpdate,
} from '@/lib/liveness';

/** Self-hosted copy (scripts/copy-mediapipe.mjs), with Google's official copy as a fallback. */
const MODEL_URLS = ['/mediapipe/face_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'];
const WASM_PATH = '/mediapipe/wasm';
const NEUTRAL_HOLD_MS = 700;

type Phase = 'intro' | 'loading' | 'running' | 'uploading' | 'done' | 'error';

async function loadLandmarker(): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  let lastError: unknown;
  for (const modelAssetPath of MODEL_URLS) {
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        return await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
        });
      } catch (err) {
        lastError = err;
      }
    }
  }
  throw lastError ?? new Error('Could not load the face check.');
}

function cameraErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked. Allow the camera for Closebuy in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'We could not find a front camera on this device.';
  if (name === 'NotReadableError') return 'Your camera is being used by another app. Close it and try again.';
  return 'The camera could not start. Please try again.';
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.85));

/**
 * Live selfie check for delivery agents: opens the front camera, asks for a straight-on look and
 * then a few random moves (turn left/right, nod, open mouth, blink), recognising each one on the
 * phone itself. Photos of the face and of every move go to the admin for review.
 */
export function LiveSelfieCheck({ open, onOpenChange, onPassed }: { open: boolean; onOpenChange: (o: boolean) => void; onPassed: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<LivenessStep[]>([]);
  const [current, setCurrent] = useState(-1); // -1 = straight-on photo, then the moves
  const [hint, setHint] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Release the camera whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase('intro');
      setError(null);
    }
    return stopCamera;
  }, [open, stopCamera]);
  useEffect(() => () => landmarkerRef.current?.close(), []);

  const fail = useCallback(
    (message: string) => {
      stopCamera();
      setError(message);
      setPhase('error');
    },
    [stopCamera],
  );

  const run = useCallback(async () => {
    setError(null);
    setHint(null);
    setCurrent(-1);
    setPhase('loading');

    // 1. Camera.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      return fail(cameraErrorMessage(err));
    }

    // 2. Face model (downloaded once, then cached by the browser).
    try {
      landmarkerRef.current ??= await loadLandmarker();
    } catch {
      return fail('The face check could not load. Check your internet connection and try again.');
    }

    // 3. Ask the server for this check's random moves.
    let check: { id: string; steps: LivenessStep[] };
    try {
      const res = await fetch('/api/account/liveness', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return fail(data.error ?? 'Could not start the check.');
      check = data;
    } catch {
      return fail('Could not start the check. Check your internet connection.');
    }
    setSteps(check.steps);
    setPhase('running');

    // 4. Watch the camera.
    const video = videoRef.current!;
    const landmarker = landmarkerRef.current!;
    const shots = Array.from({ length: check.steps.length + 1 }, () => document.createElement('canvas')); // straight-on + one per move
    const snap = (i: number) => {
      const c = shots[i];
      const scale = Math.min(1, 640 / video.videoWidth);
      c.width = Math.round(video.videoWidth * scale);
      c.height = Math.round(video.videoHeight * scale);
      c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
    };

    let index = -1;
    let baseline: FaceMetrics | null = null;
    let neutralSince: number | null = null;
    let detector: ((m: FaceMetrics, t: number) => StepUpdate) | null = null;
    let stepStarted = performance.now();
    let captured = false;
    let lastVideoTime = -1;

    const finish = async () => {
      stopCamera();
      setPhase('uploading');
      try {
        const form = new FormData();
        form.append('neutral', await toBlob(shots[0]), 'neutral.jpg');
        for (let i = 0; i < check.steps.length; i++) form.append(`move${i}`, await toBlob(shots[i + 1]), `move${i}.jpg`);
        const res = await fetch(`/api/account/liveness/${check.id}`, { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return fail(data.error ?? 'Could not save your check. Please try again.');
        setPhase('done');
        onPassed();
      } catch {
        fail('Could not send your photos. Check your internet connection and try again.');
      }
    };

    const tick = () => {
      if (!streamRef.current) return;
      const now = performance.now();
      if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, now);
        const faces = result.faceLandmarks.length;
        const shapes: Blendshapes = {};
        for (const c of result.faceBlendshapes?.[0]?.categories ?? []) {
          if (c.categoryName === 'jawOpen' || c.categoryName === 'eyeBlinkLeft' || c.categoryName === 'eyeBlinkRight') shapes[c.categoryName] = c.score;
        }
        const m = faces ? metricsFromLandmarks(result.faceLandmarks[0], shapes) : null;
        const framing = framingHint(m, faces);

        if (index === -1) {
          // Straight-on photo: face well placed and still for a moment.
          if (framing || !m) {
            neutralSince = null;
            setHint(framing);
          } else if (!isNeutral(m)) {
            neutralSince = null;
            setHint('Look straight at the camera');
          } else {
            setHint('Hold still…');
            neutralSince ??= now;
            if (now - neutralSince >= NEUTRAL_HOLD_MS) {
              snap(0);
              baseline = m;
              index = 0;
              setCurrent(0);
              setHint(null);
              detector = createStepDetector(check.steps[0], baseline);
              stepStarted = now;
              captured = false;
            }
          }
        } else if (detector) {
          if (faces > 1) setHint('Only one face should be in view');
          else if (!m) setHint('Keep your face in the oval');
          else {
            const u = detector(m, now);
            if (u.capture) {
              snap(index + 1);
              captured = true;
            }
            setHint(u.hint ?? null);
            if (u.done) {
              if (!captured) snap(index + 1);
              index += 1;
              if (index >= check.steps.length) {
                void finish();
                return;
              }
              setCurrent(index);
              detector = createStepDetector(check.steps[index], baseline!);
              stepStarted = now;
              captured = false;
            }
          }
          if (now - stepStarted > STEP_TIMEOUT_MS) return fail("We couldn't see that move clearly. Make sure your face is well lit and try again.");
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [fail, onPassed, stopCamera]);

  const prompt = current === -1 ? 'Look straight at the camera' : steps[current] ? STEP_PROMPTS[steps[current]] : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" /> Live selfie check
          </DialogTitle>
          <DialogDescription>We check that you are a real person in front of the camera. It takes about 20 seconds.</DialogDescription>
        </DialogHeader>

        {/* The video stays mounted while running so the camera stream has somewhere to play. */}
        <div className={cn('relative mx-auto aspect-[3/4] w-full max-w-[20rem] overflow-hidden rounded-2xl bg-black', phase !== 'running' && phase !== 'loading' && 'hidden')}>
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <mask id="oval-cut">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="190" rx="105" ry="140" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#oval-cut)" />
            <ellipse cx="150" cy="190" rx="105" ry="140" fill="none" stroke="white" strokeWidth="3" strokeDasharray={phase === 'running' ? '0' : '8 8'} />
          </svg>
          {phase === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              Getting the camera ready…
            </div>
          )}
          {phase === 'running' && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center text-white">
              <p className="text-lg font-semibold leading-snug" aria-live="polite">{prompt}</p>
              <p className="mt-1 min-h-5 text-sm text-white/80">{hint}</p>
              <div className="mt-3 flex justify-center gap-1.5">
                {[-1, ...steps.map((_, i) => i)].map((i) => (
                  <span key={i} className={cn('h-1.5 w-6 rounded-full', i < current ? 'bg-primary' : i === current ? 'bg-white' : 'bg-white/30')} />
                ))}
              </div>
            </div>
          )}
        </div>

        {phase === 'intro' && (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Find good light, facing a window or lamp.</li>
              <li>• Take off sunglasses, face masks and caps.</li>
              <li>• Hold your phone at eye level and follow the instructions on screen.</li>
            </ul>
            <Button className="w-full" onClick={run}>
              <Camera className="mr-2 h-4 w-4" /> Start camera
            </Button>
            <p className="text-xs text-muted-foreground">Only you and the Closebuy review team can see these photos.</p>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> Saving your check…
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <p className="font-medium">Done! Your live selfie has been saved.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4 py-2">
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
            <Button className="w-full" onClick={run}>
              <RotateCcw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
