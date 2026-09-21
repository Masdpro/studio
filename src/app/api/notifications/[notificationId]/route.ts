import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markNotificationRead, deleteNotification } from '@/lib/services/notifications';

/** Marks one of the signed-in user's own notifications as read. */
export async function PATCH(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  await markNotificationRead(notificationId, session.user.id);
  return NextResponse.json({ ok: true });
}

/** Deletes one of the signed-in user's own notifications. */
export async function DELETE(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  await deleteNotification(notificationId, session.user.id);
  return NextResponse.json({ ok: true });
}
