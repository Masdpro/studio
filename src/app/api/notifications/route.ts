import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNotificationsForUser, markAllNotificationsRead, deleteAllNotifications } from '@/lib/services/notifications';

/** Returns the signed-in user's own notifications. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  const notifications = await getNotificationsForUser(session.user.id);
  return NextResponse.json({ notifications });
}

/** Marks every one of the signed-in user's notifications as read. */
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  await markAllNotificationsRead(session.user.id);
  return NextResponse.json({ ok: true });
}

/** Deletes all of the signed-in user's notifications. */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  await deleteAllNotifications(session.user.id);
  return NextResponse.json({ ok: true });
}
