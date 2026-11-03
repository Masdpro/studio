import { CONTENT_TYPES, VIDEO_CONTENT_TYPES } from '@/lib/uploads';
import { readStoredFile } from '@/lib/storage';

// Only names this app generates (uuid + known extension) are ever looked up,
// so a crafted name can't reach anything else in storage.
const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|gif|webp|mp4|webm)$/;

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!SAFE_NAME.test(name)) return new Response('Not found', { status: 404 });
  const ext = name.split('.').pop()!;
  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPES[ext] ?? VIDEO_CONTENT_TYPES[ext],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };

  // Videos need byte-range responses so browsers can seek and start playing before the whole file arrives.
  const file = await readStoredFile('public', name, request.headers.get('range'));
  if (file === null) return new Response('Not found', { status: 404 });
  if (file === 'unsatisfiable') return new Response(null, { status: 416 });
  return new Response(file.body as BodyInit, {
    status: file.status,
    headers: { ...headers, 'Content-Length': String(file.body.length), ...(file.contentRange ? { 'Content-Range': file.contentRange } : {}) },
  });
}
