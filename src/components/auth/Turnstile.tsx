'use client';

import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;
let siteKeyPromise: Promise<string | null> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function loadSiteKey(): Promise<string | null> {
  siteKeyPromise ??= fetch('/api/auth/captcha')
    .then((r) => (r.ok ? r.json() : { siteKey: null }))
    .then((d: { siteKey?: string | null }) => d.siteKey ?? null)
    .catch(() => null);
  return siteKeyPromise;
}

/**
 * The Cloudflare "are you a person?" check. Calls `onToken` with a token to send to the
 * server (or `null` when it expires/fails). `onReady(required)` says whether the check is
 * switched on, so a form can wait for a token only when it is. Re-mount it (change its
 * `key`) after each submit, because a token can be used only once.
 */
export function Turnstile({ onToken, onReady }: { onToken: (t: string | null) => void; onReady?: (required: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const cb = useRef({ onToken, onReady });
  cb.current = { onToken, onReady };

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    (async () => {
      const siteKey = await loadSiteKey();
      if (cancelled) return;
      cb.current.onReady?.(!!siteKey);
      if (!siteKey) return;
      try {
        await loadScript();
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled || !box.current || !window.turnstile) return;
      widgetId = window.turnstile.render(box.current, {
        sitekey: siteKey,
        action: 'auth',
        theme: 'auto',
        size: 'flexible',
        callback: (t: string) => cb.current.onToken(t),
        'expired-callback': () => cb.current.onToken(null),
        'error-callback': () => cb.current.onToken(null),
      });
    })();
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  if (failed) {
    return <p className="text-sm text-destructive">The security check couldn&apos;t load. Check your connection and refresh the page.</p>;
  }
  return <div ref={box} className="min-h-0 w-full" />;
}

/** Small helper state for forms that use <Turnstile>. */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [required, setRequired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return {
    token,
    /** True while the form should wait: the check is on and hasn't produced a token yet. */
    waiting: required && !token,
    /** Use as <Turnstile key={ts.widgetKey} {...ts.widgetProps} />. */
    widgetKey: attempt,
    widgetProps: { onToken: setToken, onReady: setRequired },
    /** Call after a submit (success or not): tokens are single use, so draw a fresh one. */
    reset: () => { setToken(null); setAttempt((n) => n + 1); },
  };
}
