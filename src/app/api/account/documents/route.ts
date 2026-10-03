import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { users, verificationDocuments } from '@/db/schema';
import { DOCUMENT_CONTENT_TYPES, MAX_DOCUMENT_BYTES, PRIVATE_UPLOAD_DIR, detectDocumentExtension } from '@/lib/uploads';
import { REQUIRED_DOCUMENTS, type DocumentKind } from '@/lib/verification';

/** Vendors and agents upload their ID / business documents here (multipart: "file" + "kind"). */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const userId = session.user.id;
  const allowed = REQUIRED_DOCUMENTS[session.user.role] ?? [];
  if (allowed.length === 0) return NextResponse.json({ error: 'Your account type does not need documents.' }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Send the file as multipart form data.' }, { status: 400 });
  }
  const file = form.get('file');
  const kind = String(form.get('kind') ?? '') as DocumentKind;
  if (!allowed.includes(kind)) return NextResponse.json({ error: 'That document type is not requested for your account.' }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: 'File is too large. The limit is 5 MB.' }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectDocumentExtension(buffer);
  if (!ext || (ext === 'pdf' && (kind === 'selfie' || kind === 'store_photo'))) {
    return NextResponse.json({ error: kind === 'selfie' || kind === 'store_photo' ? 'Upload a JPG, PNG or WebP photo.' : 'Upload a JPG, PNG, WebP image or a PDF.' }, { status: 415 });
  }

  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(PRIVATE_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(PRIVATE_UPLOAD_DIR, fileName), buffer);

  // One file per document type: a new upload replaces the old one.
  const old = db.select().from(verificationDocuments).where(and(eq(verificationDocuments.userId, userId), eq(verificationDocuments.kind, kind))).all();
  db.delete(verificationDocuments).where(and(eq(verificationDocuments.userId, userId), eq(verificationDocuments.kind, kind))).run();
  for (const o of old) await unlink(path.join(PRIVATE_UPLOAD_DIR, o.fileName)).catch(() => {});

  const id = randomUUID();
  db.insert(verificationDocuments).values({ id, userId, kind, fileName, contentType: DOCUMENT_CONTENT_TYPES[ext], createdAt: new Date() }).run();

  // Uploading again after a rejection puts the account back in the review queue.
  db.update(users).set({ approvalStatus: 'pending', approvalNote: null }).where(and(eq(users.id, userId), eq(users.approvalStatus, 'rejected'))).run();
  return NextResponse.json({ id }, { status: 201 });
}
