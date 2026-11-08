'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A horizontally scrolling row that shows it can scroll: an edge fade plus arrow buttons appear on
 * whichever side still has more cards, and disappear once you reach that end. The scrollbar itself is
 * hidden: the arrows, fades and swiping already make the row scrollable.
 */
export function DealsScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [update, children]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const arrow = 'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-foreground shadow-md transition-colors hover:bg-accent';

  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className="flex gap-6 overflow-x-auto scroll-smooth p-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {canLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" aria-hidden />
          <button type="button" aria-label="Scroll deals left" onClick={() => scrollByPage(-1)} className={arrow + ' left-1'}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" aria-hidden />
          <button type="button" aria-label="Scroll deals right" onClick={() => scrollByPage(1)} className={arrow + ' right-1'}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
