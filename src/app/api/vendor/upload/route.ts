import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { userHasRole } from '@/lib/roles';
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, UPLOAD_URL_PREFIX, detectImageExtension } from '@/lib/uploads';

const REG_UPLOADS = new Map<string, number[]>();

/** A vendor uploads their storefront photo (multipart field "file"); returns the URL to save on their profile. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const isVendor = !!session?.user?.id && userHasRole(session.user.id, 'vendor');
  if (!isVendor) {
    // Someone still registering (no vendor profile yet) may upload a few photos; limited per IP to curb abuse.
    const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const now = Date.now();
    const hits = (REG_UPLOADS.get(ip) ?? []).filter((t) => now - t < 15 * 60 * 1000);
    if (hits.length >= 5) return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
    hits.push(now);
    REG_UPLOADS.set(ip, hits);
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Send the image as multipart form data.' }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'No image was provided.' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Image is too large. The limit is 5 MB.' }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExtension(buffer);
  if (!ext) return NextResponse.json({ error: 'Only JPG, PNG, GIF or WebP images are allowed.' }, { status: 415 });
  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return NextResponse.json({ url: `${UPLOAD_URL_PREFIX}${name}` }, { status: 201 });
}
