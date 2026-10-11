import { randomUUID } from 'crypto';
import { db } from '@/db';
import { analyticsEvents } from '@/db/schema';
import type { EventType } from '@/lib/analytics-events';

export function recordEvent(e: {
  type: EventType;
  sessionId: string;
  userId?: string | null;
  path?: string | null;
  productId?: string | null;
  vendorId?: string | null;
  term?: string | null;
}) {
  try {
    db.insert(analyticsEvents)
      .values({
        id: randomUUID(),
        type: e.type,
        sessionId: e.sessionId,
        userId: e.userId ?? null,
        path: e.path ?? null,
        productId: e.productId ?? null,
        vendorId: e.vendorId ?? null,
        term: e.term ?? null,
        demo: false,
        createdAt: new Date(),
      })
      .run();
  } catch (err) {
    console.error('recordEvent failed', err);
  }
}
