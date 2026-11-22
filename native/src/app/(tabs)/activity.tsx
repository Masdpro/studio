import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Empty, ErrorNote, H1, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { BOOKING_STATUS, orderStatus, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { naira } from '@/lib/theme';
import type { Order } from '@/lib/types';

function Orders() {
  const q = useGet<{ orders: Order[] }>(['orders'], '/api/orders');
  const { c } = useSide();
  const orders = [...(q.data?.orders ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return (
    <Screen tabs refreshing={q.isRefetching} onRefresh={q.refetch}>
      <H1>Your orders</H1>
      <Button small kind="ghost" title="Errands: ask a rider to buy for you" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => router.push('/errands')} />
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {!q.isLoading && !orders.length ? <Empty title="No orders yet" body="Your orders show here once you check out." /> : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        {orders.map((o) => {
          const s = orderStatus(o.status);
          return (
            <Card key={o.id} onPress={() => router.push(`/order/${o.id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label={s.label} tone={s.tone} />
                <Txt size={12} muted>{when(o.createdAt)}</Txt>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Txt weight="600" numberOfLines={1}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</Txt>
                  <Txt size={13} muted>{o.deliveryPreference === 'delivery' ? 'Delivery' : 'Pickup'} · {naira(o.totalAmount)}</Txt>
                </View>
                <ChevronRight color={c.muted} size={18} />
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

type BookingView = { id: string; serviceName: string; providerName: string; startsAt: string; status: string; total: number; location: string };

function Bookings() {
  const q = useGet<{ bookings: BookingView[] }>(['bookings'], '/api/bookings');
  const { c } = useSide();
  const now = Date.now();
  const list = q.data?.bookings ?? [];
  const upcoming = list.filter((b) => ['Requested', 'Confirmed'].includes(b.status)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = list.filter((b) => !upcoming.includes(b));
  const item = (b: BookingView) => {
    const s = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
    return (
      <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)} style={{ marginBottom: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt weight="700" numberOfLines={1} style={{ flex: 1 }}>{b.serviceName}</Txt>
          <Pill label={s.label} tone={s.tone} />
        </Row>
        <Txt size={13} muted>{b.providerName}</Txt>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Txt size={14} weight="600" color={+new Date(b.startsAt) > now ? c.text : c.muted}>{when(b.startsAt)}</Txt>
          <Txt size={14}>{naira(b.total)}</Txt>
        </Row>
      </Card>
    );
  };
  return (
    <Screen tabs refreshing={q.isRefetching} onRefresh={q.refetch}>
      <H1>Your bookings</H1>
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {!q.isLoading && !list.length ? <Empty title="No bookings yet" body="Book a service and it shows here, with your code for the end of the job." /> : null}
      {upcoming.length ? <Txt weight="700" muted style={{ marginTop: 16, marginBottom: 8 }}>COMING UP</Txt> : null}
      {upcoming.map(item)}
      {past.length ? <Txt weight="700" muted style={{ marginTop: 16, marginBottom: 8 }}>PAST</Txt> : null}
      {past.map(item)}
    </Screen>
  );
}

export default function Activity() {
  const { side } = useSide();
  const { user } = useSession();
  if (!user) return <SignInPrompt title={side === 'shop' ? 'Your orders' : 'Your bookings'} body="Sign in to see and track them." />;
  return side === 'shop' ? <Orders /> : <Bookings />;
}
