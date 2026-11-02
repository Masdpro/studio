import { readFile } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR, CONTENT_TYPES, VIDEO_CONTENT_TYPES } from '@/lib/uploads';

// Only names this app generates (uuid + known extension) are ever read from disk,
// so a crafted name can't traverse out of the uploads folder.
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

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    // Videos need byte-range responses so browsers can seek and start playing before the whole file arrives.
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : data.length - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : data.length - 1;
      start = Math.max(0, start);
      end = Math.min(end, data.length - 1);
      if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.length}` } });
      return new Response(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': String(end - start + 1) },
      });
    }
    return new Response(new Uint8Array(data), { headers: { ...headers, 'Content-Length': String(data.length) } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
