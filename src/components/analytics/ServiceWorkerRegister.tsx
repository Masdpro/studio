'use client';

import { useEffect } from 'react';

/**
 * Registers the image cache worker (public/sw.js). When it refreshes an image
 * in the background and finds a newer version, re-point any visible <img> at
 * it so the page updates without a reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'image-updated') return;
      document.querySelectorAll('img').forEach((img) => {
        if (img.currentSrc === e.data.url || img.src === e.data.url) {
          const src = img.src;
          img.src = '';
          img.src = src;
        }
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
  return null;
}
