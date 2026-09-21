import { db } from '@/db';
import { notifications as notificationsTable } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { AppNotification } from '@/lib/types';

export async function createNotification(data: {
  userId: string;
  message: string;
  category: NonNullable<AppNotification['category']>;
  link?: string;
  iconName?: string;
}): Promise<void> {
  db.insert(notificationsTable)
    .values({
      id: randomUUID(),
      userId: data.userId,
      message: data.message,
      category: data.category,
      link: data.link,
      iconName: data.iconName,
      createdAt: new Date(),
      read: false,
    })
    .run();
}

export async function getNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const rows = db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .all();
  return rows.map(rowToNotification);
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  db.update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
    .run();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, userId)).run();
}

export async function deleteNotification(id: string, userId: string): Promise<void> {
  db.delete(notificationsTable).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId))).run();
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  db.delete(notificationsTable).where(eq(notificationsTable.userId, userId)).run();
}

function rowToNotification(row: typeof notificationsTable.$inferSelect): AppNotification {
  return {
    id: row.id,
    userId: row.userId,
    message: row.message,
    createdAt: row.createdAt,
    read: !!row.read,
    link: row.link ?? undefined,
    iconName: (row.iconName ?? undefined) as AppNotification['iconName'],
    category: (row.category ?? undefined) as AppNotification['category'],
  };
}
