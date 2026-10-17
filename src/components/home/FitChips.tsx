'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const GAP = 8;

/** One row of filter chips that never wraps or scrolls: chips that don't fit are left out (the selected one is always kept). */
export function FitChips({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (c: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(items.length);

  const fit = () => {
    const wrap = wrapRef.current;
    const m = measureRef.current;
    if (!wrap || !m) return;
    const widths = Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth);
    let used = 0;
    let n = 0;
    for (const w of widths) {
      const next = used + (n ? GAP : 0) + w;
      if (next > wrap.clientWidth) break;
      used = next;
      n++;
    }
    setCount(Math.max(1, n));
  };

  useLayoutEffect(fit, [items, selected]);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  let shown = items.slice(0, count);
  if (!shown.includes(selected) && items.includes(selected) && shown.length) shown = [...shown.slice(0, -1), selected];

  const chip = (c: string, interactive: boolean) => (
    <Button
      key={c}
      variant={selected === c ? 'default' : 'outline'}
      size="sm"
      onClick={interactive ? () => onSelect(c) : undefined}
      tabIndex={interactive ? 0 : -1}
      className="shrink-0 rounded-full px-4"
    >
      {c}
    </Button>
  );

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden">
      <div className="flex flex-nowrap gap-2">{shown.map((c) => chip(c, true))}</div>
      <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex h-0 gap-2 overflow-hidden whitespace-nowrap">
        {items.map((c) => chip(c, false))}
      </div>
    </div>
  );
}
