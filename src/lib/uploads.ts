import path from 'path';

/**
 * Admin-uploaded images live on disk (outside /public, so files added while the
 * server is running are served immediately) and are streamed back through
 * /api/uploads/<name>. Set UPLOAD_DIR to point at a persistent volume in production.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_URL_PREFIX = '/api/uploads/';

export const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Identifies the image type from the file's own bytes (never trusts the client's filename or MIME type). */
export function detectImageExtension(buf: Buffer): keyof typeof CONTENT_TYPES | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}
