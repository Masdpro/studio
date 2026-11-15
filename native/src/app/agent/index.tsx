import { router, Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { MapPin, Navigation } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ApprovalBanner } from '@/components/Stat';
import { Button, Card, Chip, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useRoleApproval } from '@/lib/business';
import { confirmAsk } from '@/lib/confirm';
import { orderStatus, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import { useShareLocation } from '@/lib/tracking';
import type { Order } from '@/lib/types';

const maps = (address: string) => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);

export default function AgentHome() {
  const c = useColors('shop');
  const { user } = useSession();
  const approval = useRoleApproval('delivery_agent');
  const q = useGet<{ orders: Order[] }>(['agent-orders'], '/api/orders?as=agent', { refetchInterval: 20000 });
  const [tab, setTab] = useState<'mine' | 'open' | 'done'>('mine');
  const [deliver, setDeliver] = useState<Order | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const all = q.data?.orders ?? [];
  const mine = all.filter((o) => o.deliveryAgentId === user?.id && ['AcceptedByAgent', 'PickedUpByAgent', 'Out for Delivery'].includes(o.status));
  const open = all.filter((o) => !o.deliveryAgentId && o.status === 'ReadyForPickup');
  const done = all.filter((o) => o.deliveryAgentId === user?.id && o.status === 'Delivered').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const list = tab === 'mine' ? mine : tab === 'open' ? open : done;
  useShareLocation(mine.filter((o) => o.status !== 'AcceptedByAgent').map((o) => o.id));

  const move = async (o: Order, status: string, extra: Record<string, unknown> = {}) => {
    setErr(null);
    setBusy(o.id);
    try {
      await api(`/api/orders/${o.id}`, { method: 'PATCH', body: { status, actingAs: 'agent', ...extra } });
      await q.refetch();
      return true;
    } catch (e: any) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Deliveries' }} />
      <ApprovalBanner side="shop" status={approval?.approvalStatus} note={approval?.approvalNote} onPress={() => router.push('/verification')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        <Chip side="shop" label={`My jobs${mine.length ? ` (${mine.length})` : ''}`} active={tab === 'mine'} onPress={() => setTab('mine')} />
        <Chip side="shop" label={`Available${open.length ? ` (${open.length})` : ''}`} active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip side="shop" label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
        <Chip side="shop" label="Errands" onPress={() => router.push('/agent/errands')} />
        <Chip side="shop" label="Profile" onPress={() => router.push('/agent/profile')} />
        <Chip side="shop" label="Earnings" onPress={() => router.push('/withdraw')} />
      </ScrollView>
      <ErrorNote error={err ? new Error(err) : q.error} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title={tab === 'open' ? 'No deliveries waiting' : tab === 'mine' ? 'No jobs right now' : 'No deliveries yet'} body={tab === 'mine' ? 'Pick one from Available.' : undefined} /> : null}
      <View style={{ gap: 10 }}>
        {list.map((o) => {
          const s = orderStatus(o.status);
          return (
            <Card side="shop" key={o.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label={s.label} tone={s.tone} />
                <Txt side="shop" weight="800">{naira(o.deliveryFee)}</Txt>
              </Row>
              <Row gap={8} style={{ marginTop: 8, alignItems: 'flex-start' }}>
                <MapPin size={16} color={c.muted} />
                <View style={{ flex: 1 }}>
                  <Txt side="shop" size={12} muted>PICK UP</Txt>
                  <Txt side="shop" size={14}>{o.pickupAddress}</Txt>
                </View>
              </Row>
              <Row gap={8} style={{ marginTop: 6, alignItems: 'flex-start' }}>
                <Navigation size={16} color={c.muted} />
                <View style={{ flex: 1 }}>
                  <Txt side="shop" size={12} muted>DELIVER TO</Txt>
                  <Txt side="shop" size={14}>{o.deliveryAddress}</Txt>
                </View>
              </Row>
              <Txt side="shop" size={12} muted style={{ marginTop: 6 }}>{o.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {when(o.createdAt)}</Txt>
              {tab === 'open' ? (
                <Button side="shop" small title="Take this delivery" style={{ marginTop: 10 }} loading={busy === o.id} disabled={approval?.mayTrade === false} onPress={() => move(o, 'AcceptedByAgent')} />
              ) : null}
              {o.status === 'AcceptedByAgent' && tab === 'mine' ? (
                <Row style={{ marginTop: 10 }}>
                  <Button side="shop" small kind="ghost" title="Directions" onPress={() => maps(o.pickupAddress)} />
                  <Button side="shop" small title="I’ve collected it" style={{ flex: 1 }} loading={busy === o.id} onPress={() => confirmAsk('Collected from the shop?', 'The customer gets their delivery code now.', 'Yes', () => move(o, 'PickedUpByAgent'))} />
                </Row>
              ) : null}
              {(o.status === 'PickedUpByAgent' || o.status === 'Out for Delivery') && tab === 'mine' ? (
                <Row style={{ marginTop: 10 }}>
                  <Button side="shop" small kind="ghost" title="Directions" onPress={() => maps(o.deliveryAddress)} />
                  <Button side="shop" small title="Enter delivery code" style={{ flex: 1 }} onPress={() => { setDeliver(o); setCode(''); }} />
                </Row>
              ) : null}
            </Card>
          );
        })}
      </View>
      <Sheet side="shop" visible={!!deliver} onClose={() => setDeliver(null)} title="Hand over the order">
        <Txt side="shop" muted style={{ marginBottom: 12 }}>Ask the customer for their 4-digit delivery code once they’ve checked the items.</Txt>
        <Field side="shop" label="Delivery code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" autoFocus />
        {err ? <Txt side="shop" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
        <Button side="shop" title="Confirm delivery" disabled={code.length !== 4} loading={!!deliver && busy === deliver.id} onPress={async () => { if (deliver && (await move(deliver, 'Delivered', { deliveryCode: code }))) setDeliver(null); }} />
      </Sheet>
    </Screen>
  );
}
