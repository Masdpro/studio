import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { ERRAND_STATUS, ago } from '@/lib/format';
import type { Errand } from '@/lib/types';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';

export default function Errands() {
  const c = useColors('shop');
  const qc = useQueryClient();
  const q = useGet<{ errands: Errand[] }>(['errands'], '/api/errands');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState('');
  const [store, setStore] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = [...(q.data?.errands ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>('/api/errands', { body: { itemsDescription: items, preferredStore: store || undefined, deliveryAddress: address } });
      setOpen(false);
      setItems('');
      qc.invalidateQueries({ queryKey: ['errands'] });
      router.push(`/errands/${id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Errands' }} />
      <Txt side="shop" muted>Tell us what you need from anywhere. Riders send you a price; you pick one.</Txt>
      <Button side="shop" title="New errand" style={{ marginTop: 12 }} onPress={() => setOpen(true)} />
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="No errands yet" /> : null}
      <View style={{ marginTop: 14, gap: 10 }}>
        {list.map((e) => {
          const s = ERRAND_STATUS[e.status] ?? { label: e.status, tone: 'neutral' as const };
          return (
            <Card side="shop" key={e.id} onPress={() => router.push(`/errands/${e.id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label={s.label} tone={s.tone} />
                <Txt side="shop" size={12} muted>{ago(e.createdAt)}</Txt>
              </Row>
              <Txt side="shop" weight="600" style={{ marginTop: 8 }} numberOfLines={2}>{e.itemsDescription}</Txt>
              {e.finalTotalCost ?? e.estimatedTotalItemCost ? <Txt side="shop" size={13} muted>{naira((e.estimatedTotalItemCost ?? 0) + (e.deliveryFee ?? 0))}</Txt> : null}
            </Card>
          );
        })}
      </View>
      <Sheet side="shop" visible={open} onClose={() => setOpen(false)} title="New errand">
        <Field side="shop" label="What do you need?" value={items} onChangeText={setItems} multiline placeholder="e.g. 2 bags of rice (50kg), 1 crate of eggs" />
        <Field side="shop" label="Where to buy (optional)" value={store} onChangeText={setStore} placeholder="e.g. Shoprite Lekki" />
        <Field side="shop" label="Deliver to" value={address} onChangeText={setAddress} multiline style={{ minHeight: 60 }} />
        {err ? <Txt side="shop" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
        <Button side="shop" title="Ask for quotes" onPress={submit} loading={busy} disabled={items.trim().length < 3 || address.trim().length < 5} />
      </Sheet>
    </Screen>
  );
}
