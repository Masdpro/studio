'use client';

import { useEffect } from 'react';
import { saveDeviceAddress } from '@/lib/delivery-address';

/**
 * On landing, asks for the customer's location with the browser's own prompt (once per visit) and
 * keeps it as a street address for checkout. It is not applied to the home filter.
 */
export function DeviceLocation() {
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    try { if (sessionStorage.getItem('closebuy-located')) return; sessionStorage.setItem('closebuy-located', '1'); } catch { /* ignore */ }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          const address: string | undefined = res.ok ? (await res.json()).address : undefined;
          if (address) {
            saveDeviceAddress({ address, latitude, longitude, source: 'auto' });
            window.dispatchEvent(new Event('device-address'));
          }
        } catch { /* offline: try next visit */ }
      },
      () => { /* declined or unavailable: checkout just starts empty */ },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5 * 60_000 },
    );
  }, []);
  return null;
}
