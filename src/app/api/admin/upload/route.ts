import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { requireAdminSession } from '@/lib/admin-guard';
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, UPLOAD_URL_PREFIX, detectImageExtension } from '@/lib/uploads';

/** Accepts one image (multipart field "file") and returns the URL to store on a product, vendor, market or agent. */
export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Send the image as multipart form data.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image was provided.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image is too large. The limit is 5 MB.' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExtension(buffer);
  if (!ext) {
    return NextResponse.json({ error: 'Only JPG, PNG, GIF or WebP images are allowed.' }, { status: 415 });
  }

  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return NextResponse.json({ url: `${UPLOAD_URL_PREFIX}${name}` }, { status: 201 });
}
