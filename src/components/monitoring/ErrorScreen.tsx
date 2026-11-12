'use client';

import { useEffect } from 'react';

/** Friendly page shown when something breaks. The reference lets support find the error in the logs and Sentry. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Reported only if browser error tracking was started (see ErrorTracking).
    import('@sentry/nextjs')
      .then((Sentry) => Sentry.getClient() && Sentry.captureException(error, { tags: { digest: error.digest } }))
      .catch(() => {});
  }, [error]);
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ color: '#6b6b6b', lineHeight: 1.5, margin: 0 }}>
          Sorry, this page hit a problem. It has been reported to us. Please try again, or go back to the shop.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={reset}
            style={{ background: '#ff7a45', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
          <a href="/shop" style={{ border: '1px solid #ddd', borderRadius: 8, padding: '10px 18px', fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
            Go to the shop
          </a>
        </div>
        {error.digest && <p style={{ color: '#999', fontSize: 12, marginTop: 20 }}>Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
