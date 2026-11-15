import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Empty, ErrorNote, Field, Loading, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import type { Errand } from '@/lib/types';

export default function AgentErrands() {
  const c = useColors('shop');
  const q = useGet<{ errands: Errand[] }>(['agent-errands'], '/api/errands?as=agent', { refetchInterval: 30000 });
  const [quote, setQuote] = useState<Errand | null>(null);
  const [items, setItems] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const send = async () => {
    if (!quote) return;
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/errands/${quote.id}/quotes`, { body: { estimatedItemCost: Number(items), deliveryFee: Number(fee), agentNotes: notes || undefined } });
      setSent((s) => [...s, quote.id]);
      setQuote(null);
      q.refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Errands to quote' }} />
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !q.data.errands.length ? <Empty title="No open errands" body="New requests from customers show up here." /> : null}
      <View style={{ gap: 10 }}>
        {q.data?.errands.map((e) => (
          <Card side="shop" key={e.id}>
            <Txt side="shop" weight="700">{e.itemsDescription}</Txt>
            {e.preferredStore ? <Txt side="shop" size={13} muted>From {e.preferredStore}</Txt> : null}
            <Txt side="shop" size={13} muted>To {e.deliveryAddress} · {ago(e.createdAt)}</Txt>
            {sent.includes(e.id) ? <Txt side="shop" size={13} color={c.success} style={{ marginTop: 8 }}>Quote sent</Txt> : <Button side="shop" small title="Send a quote" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => { setQuote(e); setErr(null); }} />}
          </Card>
        ))}
      </View>
      <Sheet side="shop" visible={!!quote} onClose={() => setQuote(null)} title="Your quote">
        <Field side="shop" label="Items will cost about (₦)" value={items} onChangeText={(t) => setItems(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Field side="shop" label="Your delivery fee (₦)" value={fee} onChangeText={(t) => setFee(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Field side="shop" label="Note (optional)" value={notes} onChangeText={setNotes} multiline />
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Txt side="shop" muted>Customer sees</Txt>
          <Txt side="shop" weight="800">{naira((Number(items) || 0) + (Number(fee) || 0))}</Txt>
        </Row>
        {err ? <Txt side="shop" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
        <Button side="shop" title="Send quote" onPress={send} loading={busy} disabled={!items || !fee} />
      </Sheet>
    </Screen>
  );
}
