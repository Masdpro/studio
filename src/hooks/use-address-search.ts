'use client';

import { useEffect, useState } from 'react';
import type { AddressSuggestion } from '@/lib/address-search';

/** Address suggestions for what the customer is typing (debounced; needs 3+ characters). */
export function useAddressSearch(query: string, near?: { latitude?: number; longitude?: number } | null) {
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const q = query.trim();
  useEffect(() => {
    if (q.length < 3) { setResults([]); setLoading(false); return; }
    let off = false;
    setLoading(true);
    const t = setTimeout(() => {
      const bias = near?.latitude != null && near?.longitude != null ? `&lat=${near.latitude}&lon=${near.longitude}` : '';
      fetch(`/api/geocode/search?q=${encodeURIComponent(q)}${bias}`)
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((d: { suggestions: AddressSuggestion[] }) => { if (!off) setResults(d.suggestions ?? []); })
        .catch(() => { if (!off) setResults([]); })
        .finally(() => { if (!off) setLoading(false); });
    }, 350);
    return () => { off = true; clearTimeout(t); };
  }, [q, near?.latitude, near?.longitude]);
  return { results, loading };
}
