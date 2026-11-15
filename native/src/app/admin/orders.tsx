import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonSheet } from '@/components/ReasonSheet';
import { Button, Card, Chip, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { orderStatus, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { naira } from '@/lib/theme';
import type { Order } from '@/lib/types';

type AO = Order & { customerName: string; vendorName: string };
const OPEN = ['Pending', 'Processing', 'ReadyForPickup', 'ReadyForCustomerPickup', 'AcceptedByAgent', 'PickedUpByAgent', 'Out for Delivery'];

export default function AdminOrders() {
  const q = useGet<{ orders: AO[] }>(['admin-orders'], '/api/admin/orders');
  const [tab, setTab] = useState<'open' | 'all'>('open');
  const [find, setFind] = useState('');
  const [cancel, setCancel] = useState<AO | null>(null);
  const f = find.trim().toLowerCase();
  const list = (q.data?.orders ?? []).filter((o) => (tab === 'all' || OPEN.includes(o.status)) && (!f || `${o.id} ${o.customerName} ${o.vendorName}`.toLowerCase().includes(f)));
  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <Row style={{ marginBottom: 8 }}>
        <Chip side="shop" label="Open" active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip side="shop" label="All" active={tab === 'all'} onPress={() => setTab('all')} />
      </Row>
      <Field side="shop" value={find} onChangeText={setFind} placeholder="Search by customer, shop or order number" />
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="No orders" /> : null}
      <View style={{ gap: 10 }}>
        {list.slice(0, 100).map((o) => {
          const s = orderStatus(o.status);
          return (
            <Card side="shop" key={o.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label={s.label} tone={s.tone} />
                <Txt side="shop" size={12} muted>{when(o.createdAt)}</Txt>
              </Row>
              <Txt side="shop" weight="700" style={{ marginTop: 6 }}>{o.vendorName} → {o.customerName}</Txt>
              <Txt side="shop" size={13} muted numberOfLines={2}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</Txt>
              <Txt side="shop" size={13}>{naira(o.totalAmount)} · {o.deliveryPreference} · #{o.id.slice(0, 8)}</Txt>
              {o.status !== 'Cancelled' && OPEN.includes(o.status) ? <Button side="shop" small kind="ghost" title="Cancel and refund" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => setCancel(o)} /> : null}
            </Card>
          );
        })}
      </View>
      <ReasonSheet title="Cancel and refund" label="Reason the customer and shop will see" action="Cancel order" danger visible={!!cancel} onClose={() => setCancel(null)} onSubmit={async (reason) => { await api(`/api/admin/orders/${cancel!.id}`, { body: { reason } }); await q.refetch(); }} />
    </Screen>
  );
}
