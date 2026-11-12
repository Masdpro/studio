'use client';

import { useEffect } from 'react';

let started = false;

/** Starts browser error tracking when the server has a Sentry DSN. Renders nothing. */
export function ErrorTracking() {
  useEffect(() => {
    if (started) return;
    started = true;
    fetch('/api/monitoring')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (cfg: { dsn: string | null; environment: string; release: string | null } | null) => {
        if (!cfg?.dsn) return;
        // Loaded only when error tracking is switched on, so it adds nothing to pages otherwise.
        const Sentry = await import('@sentry/nextjs');
        Sentry.init({
          dsn: cfg.dsn,
          environment: cfg.environment,
          release: cfg.release ?? undefined,
          tracesSampleRate: 0,
          dataCollection: { userInfo: false, cookies: false, httpBodies: [], urlQueryParams: { deny: ['token', 'code', 'reference', 'email', 'phone', 'callbackUrl'] } },
          // Noise from browser extensions and flaky networks, not from our code.
          ignoreErrors: ['ResizeObserver loop', 'Failed to fetch', 'NetworkError', 'Load failed', 'AbortError'],
        });
      })
      .catch(() => {});
  }, []);
  return null;
}
