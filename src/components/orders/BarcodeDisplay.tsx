// src/components/orders/BarcodeDisplay.tsx
'use client';

import { Barcode } from 'lucide-react';

interface BarcodeDisplayProps {
  orderId: string;
  label: string;
}

export function BarcodeDisplay({ orderId, label }: BarcodeDisplayProps) {
  return (
    <div className="mt-3 p-3 border border-dashed rounded-md bg-muted/50">
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}:</p>
      <div className="flex flex-col items-center sm:flex-row sm:items-end gap-2">
        {/* Simple SVG to represent a barcode - Not a real scannable barcode */}
        <svg
          viewBox="0 0 150 50"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="w-full h-auto max-w-[180px] max-h-[50px] text-foreground"
          preserveAspectRatio="xMidYMid meet"
          data-ai-hint="barcode illustration"
        >
          <rect x="5" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="10" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="17" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="20" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="26" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="30" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="37" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="40" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="46" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="50" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="57" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="60" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="66" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="70" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="77" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="80" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="86" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="90" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="97" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="100" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="106" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="110" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="117" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="120" y="5" width="3" height="40" fill="currentColor"/>
          <rect x="126" y="5" width="2" height="40" fill="currentColor"/>
          <rect x="130" y="5" width="4" height="40" fill="currentColor"/>
          <rect x="137" y="5" width="1" height="40" fill="currentColor"/>
          <rect x="140" y="5" width="3" height="40" fill="currentColor"/>
        </svg>
        <div className="text-center sm:text-left">
          <p className="text-xs text-muted-foreground">Scan Order ID:</p>
          <p className="font-mono text-lg font-semibold text-primary tracking-wider">{orderId}</p>
        </div>
      </div>
    </div>
  );
}
