'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Long lists draw a first screenful straight away and add more as the person scrolls towards the end,
 * so a page with hundreds of items still opens instantly (on slower phones too). Starts again from the
 * top whenever `resetKey` changes (for example, a new search or filter).
 */
export function useRevealMore(total: number, resetKey: unknown, first = 12, step = 24) {
  const [count, setCount] = useState(first);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setCount(first); }, [resetKey, first]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || count >= total) return;
    if (typeof IntersectionObserver === 'undefined') { setCount(total); return; }
    // Start adding the next batch well before the person reaches the end, so they never see it happen.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setCount((c) => Math.min(total, c + step));
    }, { rootMargin: '1500px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [count, total, step]);

  return { count: Math.min(count, total), sentinelRef, hasMore: count < total };
}
