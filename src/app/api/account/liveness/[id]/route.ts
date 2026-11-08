import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LivenessError, completeLivenessCheck } from '@/lib/services/liveness';

/**
 * Finishes a live selfie check. Multipart form: "neutral" (straight-on photo) and "move0",
 * "move1", … (one photo per move, in the order the check asked for them).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Send the photos as multipart form data.' }, { status: 400 });
  }
  const toBuffer = async (v: FormDataEntryValue | null) => (v instanceof File ? Buffer.from(await v.arrayBuffer()) : null);
  const neutral = await toBuffer(form.get('neutral'));
  const moves: Buffer[] = [];
  for (let i = 0; i < 10; i++) {
    const b = await toBuffer(form.get(`move${i}`));
    if (!b) break;
    moves.push(b);
  }
  if (!neutral) return NextResponse.json({ error: 'The straight-on photo is missing.' }, { status: 400 });

  try {
    const result = await completeLivenessCheck(session.user.id, id, neutral, moves);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof LivenessError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
