
// src/components/orders/DeliveryMapTracker.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Truck } from 'lucide-react';
import type { Order } from '@/lib/types';

const agentIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#f97316;border-radius:9999px;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destinationIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#1f2937;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

type LatLng = [number, number];

interface DeliveryMapTrackerProps {
  orderId: string;
  deliveryAddress: string;
}

/** Live map of a delivery agent's position while an order is out for delivery. Polls the order every 5s. */
export function DeliveryMapTracker({ orderId, deliveryAddress }: DeliveryMapTrackerProps) {
  const [agentPosition, setAgentPosition] = useState<LatLng | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationFailed, setDestinationFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);

  // Resolve the delivery address to coordinates once.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/geocode/forward?address=${encodeURIComponent(deliveryAddress)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setDestination([data.latitude, data.longitude]);
      })
      .catch(() => {
        if (!cancelled) setDestinationFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [deliveryAddress]);

  // Poll the agent's live position.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok || cancelled) return;
        const { order } = (await res.json()) as { order: Order };
        if (cancelled || order.agentLatitude == null || order.agentLongitude == null) return;
        setAgentPosition([order.agentLatitude, order.agentLongitude]);
        setLastUpdated(order.agentLocationUpdatedAt ? new Date(order.agentLocationUpdatedAt) : new Date());
      } catch {
        // Transient poll failure — the next interval tick will retry.
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  // Create the map exactly once, as soon as we have a first position and the container is mounted.
  // Managed by hand (not react-leaflet's <MapContainer>) because MapContainer's lifecycle doesn't
  // survive React 18 Strict Mode's dev-time double-mount ("Map container is already initialized").
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !agentPosition) return;

    const map = L.map(containerRef.current).setView(agentPosition, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      agentMarkerRef.current = null;
      destinationMarkerRef.current = null;
    };
  }, [agentPosition !== null]);

  // Keep markers and the viewport in sync as new positions come in.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agentPosition) return;

    if (agentMarkerRef.current) {
      agentMarkerRef.current.setLatLng(agentPosition);
    } else {
      agentMarkerRef.current = L.marker(agentPosition, { icon: agentIcon }).addTo(map).bindPopup('Delivery agent');
    }

    if (destination) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng(destination);
      } else {
        destinationMarkerRef.current = L.marker(destination, { icon: destinationIcon })
          .addTo(map)
          .bindPopup('Delivery address');
      }
      map.fitBounds([agentPosition, destination], { padding: [40, 40] });
    } else {
      map.setView(agentPosition, map.getZoom());
    }
  }, [agentPosition, destination]);

  if (!agentPosition) {
    return (
      <div className="flex items-center justify-center h-48 rounded-md border bg-muted/30 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Waiting for the agent&apos;s location…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-64 rounded-md overflow-hidden border" />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Truck className="h-3 w-3 shrink-0" />
        {lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : 'Waiting for update…'}
        {destinationFailed && ' — could not place the delivery address on the map'}
      </p>
    </div>
  );
}
