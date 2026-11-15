import { QueryClient, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Catalog } from './types';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: (n, e: any) => n < 2 && (e?.status ?? 0) >= 500 } },
});

/** Shop and Book home data (products, shops, markets, branches, service businesses). */
export const useCatalog = () =>
  useQuery({ queryKey: ['catalog'], queryFn: () => api<Catalog>('/api/mobile/catalog'), staleTime: 60_000 });

/** GET helper: useGet(['wallet'], '/api/wallet'). */
export function useGet<T = any>(key: unknown[], path: string | null, opts: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api<T>(path!),
    enabled: !!path && opts.enabled !== false,
    refetchInterval: opts.refetchInterval,
  });
}
