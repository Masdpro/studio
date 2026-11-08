// Puts the files the live selfie check needs under public/mediapipe so they are served from our
// own site: the face-tracking engine (from the installed @mediapipe/tasks-vision package) and
// Google's face model. Runs before `next dev` and `next build`. If the model can't be downloaded,
// the check falls back to Google's copy at run time, so a failed download never breaks the build.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';

const out = path.join(process.cwd(), 'public', 'mediapipe');
const wasmOut = path.join(out, 'wasm');
mkdirSync(wasmOut, { recursive: true });

const src = path.join(process.cwd(), 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(path.join(src, f), path.join(wasmOut, f));
}

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const model = path.join(out, 'face_landmarker.task');
if (!existsSync(model) || statSync(model).size < 1_000_000) {
  try {
    const res = await fetch(MODEL_URL, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1_000_000) throw new Error('file too small');
    writeFileSync(model, buf);
    console.log(`[mediapipe] face model saved (${(buf.length / 1e6).toFixed(1)} MB)`);
  } catch (err) {
    console.warn(`[mediapipe] could not download the face model (${err.message}); the app will load Google's copy instead.`);
  }
}
console.log('[mediapipe] engine files ready in public/mediapipe');
