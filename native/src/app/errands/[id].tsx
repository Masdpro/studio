import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Empty, ErrorNote, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { ERRAND_STATUS, ago } from '@/lib/format';
import { useGet } from '@/lib/query';
import { naira } from '@/lib/theme';
import type { Errand } from '@/lib/types';

type Quote = { id: string; agentName?: string; estimatedItemCost: number; deliveryFee: number; totalEstimatedCost: number; agentNotes?: string; status: string; createdAt: string };

export default function ErrandScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const list = useGet<{ errands: Errand[] }>(['errands'], '/api/errands', { refetchInterval: 20000 });
  const quotes = useGet<{ quotes: Quote[] }>(['quotes', id], `/api/errands/${id}/quotes`, { refetchInterval: 20000 });
  const e = list.data?.errands.find((x) => x.id === id);
  const [err, setErr] = useState<string | null>(null);
  if (!e) return <Screen side="shop" edges={[]}>{list.isLoading ? <Loading /> : <Empty title="Errand not found" />}</Screen>;
  const s = ERRAND_STATUS[e.status] ?? { label: e.status, tone: 'neutral' as const };
  const choosing = e.status === 'PendingQuotes' || e.status === 'AwaitingAcceptance';

  const accept = (q: Quote) =>
    confirmAsk('Accept this quote?', `${q.agentName ?? 'The rider'} will do your errand for about ${naira(q.totalEstimatedCost)}.`, 'Accept', async () => {
      setErr(null);
      try {
        await api(`/api/errands/${id}`, { method: 'PATCH', body: { acceptedQuoteId: q.id } });
        qc.invalidateQueries({ queryKey: ['errands'] });
        quotes.refetch();
      } catch (x: any) {
        setErr(x.message);
      }
    });

  return (
    <Screen side="shop" edges={[]} refreshing={list.isRefetching} onRefresh={() => { list.refetch(); quotes.refetch(); }}>
      <Stack.Screen options={{ title: 'Errand' }} />
      <Pill label={s.label} tone={s.tone} />
      <Txt side="shop" size={18} weight="700" style={{ marginTop: 10 }}>{e.itemsDescription}</Txt>
      {e.preferredStore ? <Txt side="shop" muted>From {e.preferredStore}</Txt> : null}
      <Txt side="shop" muted size={14} style={{ marginTop: 6 }}>Deliver to {e.deliveryAddress}</Txt>
      <Txt side="shop" weight="700" muted size={12} style={{ marginTop: 20, marginBottom: 8 }}>QUOTES</Txt>
      {quotes.isLoading ? <Loading /> : null}
      {quotes.data && !quotes.data.quotes.length ? <Txt side="shop" muted>No quotes yet. Riders nearby can see your errand.</Txt> : null}
      {quotes.data?.quotes.map((q) => (
        <Card side="shop" key={q.id} style={{ marginBottom: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt side="shop" weight="700">{q.agentName ?? 'Rider'}</Txt>
            <Txt side="shop" weight="800" size={17}>{naira(q.totalEstimatedCost)}</Txt>
          </Row>
          <Txt side="shop" size={13} muted>Items about {naira(q.estimatedItemCost)} + delivery {naira(q.deliveryFee)} · {ago(q.createdAt)}</Txt>
          {q.agentNotes ? <Txt side="shop" size={14} style={{ marginTop: 6 }}>{q.agentNotes}</Txt> : null}
          {choosing && q.status === 'Pending' ? <Button side="shop" small title="Accept" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => accept(q)} /> : <Pill label={q.status} tone={q.status === 'Accepted' ? 'good' : 'neutral'} />}
        </Card>
      ))}
      <ErrorNote error={err ? new Error(err) : null} />
    </Screen>
  );
}
