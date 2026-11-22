import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { orderStatus, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { naira } from '@/lib/theme';
import type { Order } from '@/lib/types';

const TABS = [
  ['new', 'New', ['Pending']],
  ['prep', 'Preparing', ['Processing']],
  ['ready', 'Ready', ['ReadyForPickup', 'ReadyForCustomerPickup', 'AcceptedByAgent']],
  ['done', 'Done', ['PickedUpByAgent', 'Out for Delivery', 'Delivered', 'PickedUpByCustomer', 'Cancelled']],
] as const;

export default function VendorOrders() {
  const { as } = useLocalSearchParams<{ as?: string }>();
  const who = as === 'branch' ? 'branch' : 'vendor';
  const qc = useQueryClient();
  const q = useGet<{ orders: Order[] }>(['vendor-orders', who], `/api/orders?as=${who}`, { refetchInterval: 20000 });
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('new');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Pickup codes being typed, per order.
  const [codes, setCodes] = useState<Record<string, string>>({});
  const statuses = TABS.find((t) => t[0] === tab)![2] as readonly string[];
  const list = [...(q.data?.orders ?? [])].filter((o) => statuses.includes(o.status)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const count = (s: readonly string[]) => q.data?.orders.filter((o) => s.includes(o.status)).length ?? 0;

  const move = async (o: Order, status: string, deliveryCode?: string) => {
    setErr(null);
    setBusy(o.id);
    try {
      await api(`/api/orders/${o.id}`, { method: 'PATCH', body: { status, actingAs: 'vendor', deliveryCode } });
      await q.refetch();
      qc.invalidateQueries({ queryKey: ['vendor-analytics'] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: who === 'branch' ? 'Branch orders' : 'Orders' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {TABS.map(([k, label, s]) => <Chip side="shop" key={k} label={`${label}${k !== 'done' && count(s) ? ` (${count(s)})` : ''}`} active={tab === k} onPress={() => setTab(k)} />)}
      </ScrollView>
      <ErrorNote error={err ? new Error(err) : q.error} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="Nothing here" body={tab === 'new' ? 'New orders show up here. Keep the app open or check notifications.' : undefined} /> : null}
      <View style={{ gap: 10 }}>
        {list.map((o) => {
          const s = orderStatus(o.status);
          const loading = busy === o.id;
          return (
            <Card side="shop" key={o.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label={s.label} tone={s.tone} />
                <Txt side="shop" size={12} muted>{when(o.createdAt)}</Txt>
              </Row>
              {o.items.map((i, n) => (
                <Txt side="shop" key={n} weight="600" style={{ marginTop: 6 }}>{i.quantity}× {i.name}{i.color ? `, ${i.color}` : ''}{i.size ? `, ${i.size}` : ''}</Txt>
              ))}
              <Txt side="shop" size={13} muted style={{ marginTop: 4 }}>{o.deliveryPreference === 'delivery' ? `Delivery to ${o.deliveryAddress}` : 'Customer collects'} · {naira(o.totalAmount - o.deliveryFee)}</Txt>
              {o.status === 'Pending' ? (
                <Row style={{ marginTop: 10 }}>
                  <Button side="shop" small title="Accept" loading={loading} style={{ flex: 1 }} onPress={() => move(o, 'Processing')} />
                  <Button side="shop" small kind="ghost" title="Decline" style={{ flex: 1 }} onPress={() => confirmAsk('Decline this order?', 'The customer gets a full refund.', 'Decline', () => move(o, 'Cancelled'))} />
                </Row>
              ) : null}
              {o.status === 'Processing' ? (
                <Row style={{ marginTop: 10 }}>
                  <Button side="shop" small title={o.deliveryPreference === 'delivery' ? 'Ready for a rider' : 'Ready to collect'} loading={loading} style={{ flex: 1 }} onPress={() => move(o, o.deliveryPreference === 'delivery' ? 'ReadyForPickup' : 'ReadyForCustomerPickup')} />
                  <Button side="shop" small kind="ghost" title="Cancel" onPress={() => confirmAsk('Cancel this order?', 'The customer gets a full refund and the items go back in stock.', 'Cancel order', () => move(o, 'Cancelled'))} />
                </Row>
              ) : null}
              {o.status === 'ReadyForCustomerPickup' ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Txt side="shop" size={12} muted>When the customer has checked their items, ask for the 4-digit pickup code in their Closebuy app.</Txt>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Field
                        side="shop"
                        placeholder="0000"
                        keyboardType="number-pad"
                        maxLength={4}
                        value={codes[o.id] ?? ''}
                        onChangeText={(v) => setCodes((m) => ({ ...m, [o.id]: v.replace(/\D/g, '').slice(0, 4) }))}
                        accessibilityLabel="Pickup code"
                      />
                    </View>
                    <Button side="shop" small title="Confirm collection" loading={loading} disabled={(codes[o.id] ?? '').length !== 4} onPress={() => move(o, 'PickedUpByCustomer', codes[o.id])} />
                  </Row>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
