'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedAddress } from '@/lib/delivery-address';

/**
 * One field that is both the location dropdown and an address input: pick an area, use
 * the current location, pick a previously used address, or type a new address and press Enter.
 */
export function LocationCombobox({
  areas, allValue, currentValue, selected, activeAddress, history, resolving, note,
  detected, detecting, detectError, onDetect, onUseDetected,
  onSelectArea, onSelectAddress, onSubmitAddress, onForgetAddress,
}: {
  areas: string[];
  allValue: string;
  currentValue: string;
  selected: string;
  activeAddress: string | null;
  history: SavedAddress[];
  resolving: boolean;
  note: string | null;
  detected: SavedAddress | null;
  detecting: boolean;
  detectError: string | null;
  onDetect: () => void;
  onUseDetected: () => void;
  onSelectArea: (value: string) => void;
  onSelectAddress: (a: SavedAddress) => void;
  onSubmitAddress: (address: string) => void;
  onForgetAddress: (address: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) { setOpen(false); setTyping(false); }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const label = activeAddress ?? (selected);
  const q = text.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const shownHistory = useMemo(() => history.filter((h) => match(h.address)), [history, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownAreas = areas.filter((a) => a !== allValue && a !== currentValue && match(a));
  const exact = q && (history.some((h) => h.address.toLowerCase() === q) || areas.some((a) => a.toLowerCase() === q));

  const close = () => { setOpen(false); setTyping(false); setText(''); };
  const pickArea = (v: string) => { onSelectArea(v); close(); };
  const pickAddress = (a: SavedAddress) => { onSelectAddress(a); close(); };
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    const known = history.find((h) => h.address.toLowerCase() === v.toLowerCase());
    if (known) return pickAddress(known);
    onSubmitAddress(v);
    close();
  };

  const row = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/20 focus:bg-accent/20 outline-none';

  return (
    <div ref={wrap} className="relative">
      <div className={cn('flex h-10 items-center rounded-lg border border-border bg-background pl-3 pr-2 focus-within:ring-2 focus-within:ring-primary')}>
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-label="City, area or address"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-foreground"
          value={typing ? text : ''}
          placeholder={resolving ? 'Working…' : label}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setTyping(true); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') close();
          }}
        />
        <button type="button" tabIndex={-1} aria-label="Toggle list" onClick={() => setOpen((o) => !o)}>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md">
          {q && !exact && (
            <button type="button" className={row} onClick={submit}>
              <MapPin className="h-4 w-4 text-primary" /><span>Use address &ldquo;{text.trim()}&rdquo;</span>
            </button>
          )}
          {match('All Locations') && <button type="button" className={cn(row, selected === allValue && 'font-semibold')} onClick={() => pickArea(allValue)}>All Locations</button>}
          {match('My Current Location') && (
            <button type="button" className={row} onClick={onDetect} disabled={detecting}>
              <LocateFixed className="h-4 w-4" />My Current Location
            </button>
          )}
          {detecting && <p className="px-3 py-2 text-xs text-muted-foreground">Finding your location…</p>}
          {detectError && <p className="px-3 py-2 text-xs text-destructive">{detectError}</p>}
          {detected && (
            <button type="button" className={cn(row, 'bg-accent/10')} onClick={() => { onUseDetected(); close(); }}>
              <LocateFixed className="h-4 w-4 text-primary shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Use your current location?</span>
                <span className="block">{detected.address}</span>
              </span>
            </button>
          )}
          {shownHistory.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Your addresses</p>
              {shownHistory.map((h) => (
                <div key={h.address} className={cn('flex items-center hover:bg-accent/20', activeAddress === h.address && 'font-semibold')}>
                  <button type="button" className={cn(row, 'hover:bg-transparent min-w-0')} onClick={() => pickAddress(h)}>
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{h.address}</span>
                  </button>
                  <button type="button" aria-label={`Remove ${h.address}`} className="px-3 text-muted-foreground hover:text-foreground" onClick={() => onForgetAddress(h.address)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
          {shownAreas.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Cities &amp; areas</p>
              {shownAreas.map((a) => (
                <button key={a} type="button" className={cn(row, selected === a && !activeAddress && 'font-semibold')} onClick={() => pickArea(a)}>{a}</button>
              ))}
            </>
          )}
        </div>
      )}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
