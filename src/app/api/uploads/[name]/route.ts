import { readFile } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR, CONTENT_TYPES } from '@/lib/uploads';

// Only names this app generates (uuid + known extension) are ever read from disk,
// so a crafted name can't traverse out of the uploads folder.
const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!SAFE_NAME.test(name)) return new Response('Not found', { status: 404 });

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': CONTENT_TYPES[name.split('.').pop()!],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
