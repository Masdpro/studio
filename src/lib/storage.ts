// Where uploaded files live. In development they go in the local `uploads`
// folder (as before). In production, set the R2_* variables and they go to a
// Cloudflare R2 bucket instead, so they survive server restarts and moves.
// Server-only: never import this from a client component.
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PRIVATE_UPLOAD_DIR, UPLOAD_DIR } from '@/lib/uploads';

/** 'public' = product/shop photos and videos anyone may view; 'private' = ID documents (owner + admins only). */
export type StorageArea = 'public' | 'private';

const bucket = process.env.R2_BUCKET;
const endpoint = process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined;
export const usingR2 = !!(bucket && endpoint && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });
  }
  return client;
}

// File names are always ones this app generated (uuid + extension); basename() is a second guard against "../".
const key = (area: StorageArea, name: string) => `uploads/${area}/${path.basename(name)}`;
const localPath = (area: StorageArea, name: string) => path.join(area === 'private' ? PRIVATE_UPLOAD_DIR : UPLOAD_DIR, path.basename(name));

export async function saveFile(area: StorageArea, name: string, data: Buffer, contentType: string): Promise<void> {
  if (usingR2) {
    await r2().send(new PutObjectCommand({ Bucket: bucket, Key: key(area, name), Body: data, ContentType: contentType }));
    return;
  }
  await mkdir(path.dirname(localPath(area, name)), { recursive: true });
  await writeFile(localPath(area, name), data);
}

export async function deleteFile(area: StorageArea, name: string): Promise<void> {
  try {
    if (usingR2) await r2().send(new DeleteObjectCommand({ Bucket: bucket, Key: key(area, name) }));
    else await unlink(localPath(area, name));
  } catch {
    // Already gone: nothing to do.
  }
}

export type StoredFile = { body: Uint8Array; status: 200 | 206; contentRange?: string };

/**
 * Reads a file, optionally just a byte range ("bytes=START-END", used for video
 * seeking). Returns null when the file doesn't exist and 'unsatisfiable' for a
 * range outside the file.
 */
export async function readStoredFile(area: StorageArea, name: string, range?: string | null): Promise<StoredFile | null | 'unsatisfiable'> {
  const wanted = range && /^bytes=(\d*)-(\d*)$/.test(range) && range !== 'bytes=-' ? range : undefined;
  if (usingR2) {
    try {
      const res = await r2().send(new GetObjectCommand({ Bucket: bucket, Key: key(area, name), Range: wanted }));
      const body = await res.Body!.transformToByteArray();
      return res.ContentRange ? { body, status: 206, contentRange: res.ContentRange } : { body, status: 200 };
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.$metadata?.httpStatusCode === 416 || e.name === 'InvalidRange') return 'unsatisfiable';
      if (e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  let data: Buffer;
  try {
    data = await readFile(localPath(area, name));
  } catch {
    return null;
  }
  const m = wanted ? /^bytes=(\d*)-(\d*)$/.exec(wanted) : null;
  if (!m) return { body: new Uint8Array(data), status: 200 };
  let start = m[1] ? Number(m[1]) : data.length - Number(m[2]);
  let end = m[1] && m[2] ? Number(m[2]) : data.length - 1;
  start = Math.max(0, start);
  end = Math.min(end, data.length - 1);
  if (start > end) return 'unsatisfiable';
  return { body: new Uint8Array(data.subarray(start, end + 1)), status: 206, contentRange: `bytes ${start}-${end}/${data.length}` };
}
