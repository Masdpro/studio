'use client';

import type { EventType } from '@/lib/analytics-events';

type Payload = { path?: string; productId?: string; vendorId?: string; term?: string };

export function getSessionId(): string {
  try {
    let id = window.sessionStorage.getItem('closebuy-sid');
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem('closebuy-sid', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/** Fire-and-forget usage event. Never throws and never blocks the UI. */
export function track(type: EventType, payload: Payload = {}) {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ type, sessionId: getSessionId(), path: window.location.pathname, ...payload });
    if (navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
  } catch {
    // analytics must never break the app
  }
}
