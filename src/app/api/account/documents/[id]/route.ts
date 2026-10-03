import { readFile } from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { verificationDocuments } from '@/db/schema';
import { PRIVATE_UPLOAD_DIR } from '@/lib/uploads';

/** Streams a verification document, but only to its owner or an admin. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response('Sign in required', { status: 401 });

  const doc = db.select().from(verificationDocuments).where(eq(verificationDocuments.id, id)).get();
  if (!doc || (doc.userId !== session.user.id && session.user.role !== 'admin')) return new Response('Not found', { status: 404 });

  try {
    const data = await readFile(path.join(PRIVATE_UPLOAD_DIR, path.basename(doc.fileName)));
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': doc.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
