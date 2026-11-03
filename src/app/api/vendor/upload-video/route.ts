import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';
import { authOptions } from '@/lib/auth';
import { getBranchForUser, userHasRole } from '@/lib/roles';
import { MAX_VIDEO_BYTES, UPLOAD_URL_PREFIX, detectVideoExtension, VIDEO_CONTENT_TYPES } from '@/lib/uploads';
import { saveFile } from '@/lib/storage';

/** A vendor (or branch account) uploads one product video (multipart field "file"); returns its URL. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || (!userHasRole(id, 'vendor') && !getBranchForUser(id) && session?.user?.role !== 'admin')) {
    return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Send the video as multipart form data.' }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'No video was provided.' }, { status: 400 });
  if (file.size > MAX_VIDEO_BYTES) return NextResponse.json({ error: 'Video is too large. The limit is 25 MB.' }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectVideoExtension(buffer);
  if (!ext) return NextResponse.json({ error: 'Only MP4 or WebM videos are allowed.' }, { status: 415 });
  const name = `${randomUUID()}.${ext}`;
  await saveFile('public', name, buffer, VIDEO_CONTENT_TYPES[ext]);
  return NextResponse.json({ url: `${UPLOAD_URL_PREFIX}${name}` }, { status: 201 });
}
