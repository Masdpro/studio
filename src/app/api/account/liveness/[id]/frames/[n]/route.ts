import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CONTENT_TYPES } from '@/lib/uploads';
import { readStoredFile } from '@/lib/storage';
import { liveCheckFrame } from '@/lib/services/liveness';

/** One review photo from a live selfie check (0 = straight on, then one per move). Owner or admin only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response('Sign in required', { status: 401 });

  const name = liveCheckFrame(id, Number(n), { id: session.user.id, role: session.user.role });
  if (!name) return new Response('Not found', { status: 404 });
  const file = await readStoredFile('private', name);
  if (!file || file === 'unsatisfiable') return new Response('Not found', { status: 404 });
  const ext = name.split('.').pop() ?? 'jpg';
  return new Response(file.body as BodyInit, {
    headers: { 'Content-Type': CONTENT_TYPES[ext] ?? 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
