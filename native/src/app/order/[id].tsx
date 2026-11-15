import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Check, KeyRound, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Divider, ErrorNote, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { orderStatus, when } from '@/lib/format';
import { useCatalog, useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira, radius } from '@/lib/theme';
import type { Order } from '@/lib/types';

const STEPS_DELIVERY = [
  ['Pending', 'Order placed'],
  ['Processing', 'Shop is preparing it'],
  ['ReadyForPickup', 'Waiting for a rider'],
  ['AcceptedByAgent', 'Rider heading to the shop'],
  ['PickedUpByAgent', 'On the way to you'],
  ['Delivered', 'Delivered'],
];
const STEPS_PICKUP = [
  ['Pending', 'Order placed'],
  ['Processing', 'Shop is preparing it'],
  ['ReadyForCustomerPickup', 'Ready to collect'],
  ['PickedUpByCustomer', 'Collected'],
];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors('shop');
  const qc = useQueryClient();
  const q = useGet<{ order: Order }>(['order', id], `/api/orders/${id}`, { refetchInterval: 15000 });
  const o = q.data?.order;
  const onTheWay = o && (o.status === 'PickedUpByAgent' || o.status === 'Out for Delivery');
  const code = useGet<{ code: string | null }>(['order-code', id], onTheWay ? `/api/orders/${id}/delivery-code` : null);
  const { data } = useCatalog();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!o) return <Screen side="shop" edges={[]}>{q.isLoading ? <Loading /> : <ErrorNote error={q.error} onRetry={q.refetch} />}</Screen>;

  const vendor = data?.vendors.find((v) => v.id === o.vendorId);
  const steps = o.deliveryPreference === 'delivery' ? STEPS_DELIVERY : STEPS_PICKUP;
  const current = Math.max(0, steps.findIndex(([s]) => s === (o.status === 'Out for Delivery' ? 'PickedUpByAgent' : o.status)));
  const s = orderStatus(o.status);

  const move = async (status: string) => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/orders/${id}`, { method: 'PATCH', body: { status, actingAs: 'customer' } });
      await q.refetch();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Order' }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill label={s.label} tone={s.tone} />
        <Txt side="shop" size={12} muted>{when(o.createdAt)}</Txt>
      </Row>
      <Txt side="shop" size={20} weight="800" style={{ marginTop: 10 }}>{vendor?.businessName ?? 'Your order'}</Txt>

      {onTheWay ? (
        <View style={{ backgroundColor: c.primary, borderRadius: radius.lg, padding: 18, marginTop: 14 }}>
          <Row gap={8}><KeyRound color="#fff" size={18} /><Txt color="#fff" weight="700">Your delivery code</Txt></Row>
          <Txt color="#fff" size={40} weight="800" style={{ letterSpacing: 8, marginVertical: 6 }} selectable>{code.data?.code ?? '····'}</Txt>
          <Txt color="#fff" size={13}>Check your items first. Give this code to the rider only when you’re happy: it confirms delivery and pays the shop.</Txt>
        </View>
      ) : null}

      {onTheWay && o.agentLatitude != null && o.agentLongitude != null ? (
        <Card side="shop" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`https://maps.google.com/?q=${o.agentLatitude},${o.agentLongitude}`)}>
          <Row gap={10}>
            <MapPin color={c.text} size={20} />
            <View style={{ flex: 1 }}>
              <Txt side="shop" weight="700">See where your rider is</Txt>
              <Txt side="shop" size={12} muted>Opens in Maps</Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      {o.status !== 'Cancelled' ? (
        <Card side="shop" style={{ marginTop: 14 }}>
          {steps.map(([key, label], i) => {
            const done = i <= current;
            return (
              <Row key={key} gap={12} style={{ paddingVertical: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? c.primary : c.soft, alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Check size={14} color="#fff" /> : null}
                </View>
                <Txt side="shop" weight={i === current ? '700' : '400'} muted={!done}>{label}</Txt>
              </Row>
            );
          })}
        </Card>
      ) : null}

      <Card side="shop" style={{ marginTop: 14 }}>
        {o.items.map((i, n) => (
          <Row key={n} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Txt side="shop" size={14} style={{ flex: 1 }}>{i.quantity}× {i.name}{i.color ? `, ${i.color}` : ''}{i.size ? `, ${i.size}` : ''}</Txt>
            <Txt side="shop" size={14}>{naira(i.price * i.quantity)}</Txt>
          </Row>
        ))}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}><Txt side="shop" muted>Delivery</Txt><Txt side="shop">{o.deliveryFee ? naira(o.deliveryFee) : 'Free'}</Txt></Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><Txt side="shop" weight="800">Total</Txt><Txt side="shop" weight="800">{naira(o.totalAmount)}</Txt></Row>
        <Divider />
        <Txt side="shop" size={13} muted>{o.deliveryPreference === 'delivery' ? `Deliver to: ${o.deliveryAddress}` : `Collect from: ${o.pickupAddress}`}</Txt>
      </Card>

      <ErrorNote error={err ? new Error(err) : null} />
      {o.status === 'ReadyForCustomerPickup' ? <Button side="shop" title="I’ve collected my order" style={{ marginTop: 14 }} loading={busy} onPress={() => confirmAsk('Collected your order?', 'Only confirm once you have your items. This pays the shop.', 'Yes, collected', () => move('PickedUpByCustomer'))} /> : null}
      {o.status === 'Pending' || o.status === 'Processing' ? (
        <Button side="shop" kind="ghost" title="Cancel order" style={{ marginTop: 14 }} loading={busy} onPress={() => confirmAsk('Cancel this order?', 'You get a full refund to your wallet.', 'Cancel order', () => move('Cancelled'))} />
      ) : null}
      <Txt side="shop" size={11} muted center style={{ marginTop: 16 }}>Order {o.id.slice(0, 8)}</Txt>
    </Screen>
  );
}
