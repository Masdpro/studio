'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '@/lib/services/order-tracking';

const pin = (bg: string, svg: string, size = 40) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

// Lucide-style glyphs, inlined so the markers need no extra requests.
const STORE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>';
const BIKE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';
const HOME = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';

const ICONS = {
  shop: pin('#0f766e', STORE),
  rider: pin('#f97316', BIKE, 44),
  home: pin('#111827', HOME, 34),
};

/**
 * The map behind the tracking screen: the shop, the rider (live) and the customer's door,
 * joined by a dashed line for the leg still to travel. OpenStreetMap tiles, no API key.
 */
export function TrackingMap({ shop, rider, destination }: { shop: LatLng | null; rider: LatLng | null; destination: LatLng | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);

  // Create the map once (by hand: react-leaflet's container doesn't survive Strict Mode's double mount).
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = L.map(boxRef.current, { zoomControl: false, attributionControl: true }).setView([6.5244, 3.3792], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The container can change size as the page settles; keep tiles filling it.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(boxRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  // Redraw markers and the route whenever a position changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const ll = (p: LatLng) => L.latLng(p.lat, p.lng);
    const points: L.LatLng[] = [];

    if (shop) { L.marker(ll(shop), { icon: ICONS.shop, title: 'Shop' }).addTo(layer); points.push(ll(shop)); }
    if (destination) { L.marker(ll(destination), { icon: ICONS.home, title: 'Your address' }).addTo(layer); points.push(ll(destination)); }
    if (rider) { L.marker(ll(rider), { icon: ICONS.rider, title: 'Your rider', zIndexOffset: 1000 }).addTo(layer); points.push(ll(rider)); }

    // The leg still to travel: rider → door (or shop → door before the rider is moving).
    const from = rider ?? shop;
    if (from && destination) {
      L.polyline([ll(from), ll(destination)], { color: '#0f766e', weight: 4, opacity: 0.85, dashArray: '2 8', lineCap: 'round' }).addTo(layer);
    }

    if (points.length > 1 && !fittedRef.current) {
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 16 });
      fittedRef.current = true;
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (rider && fittedRef.current && !map.getBounds().pad(-0.1).contains(ll(rider))) {
      map.panTo(ll(rider)); // keep the rider in view as they move
    }
  }, [shop?.lat, shop?.lng, rider?.lat, rider?.lng, destination?.lat, destination?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={boxRef} className="h-full w-full" aria-label="Map of your delivery" role="img" />;
}
