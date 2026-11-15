import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BadgeCheck, CalendarCheck, ChevronRight, ExternalLink, Landmark, Receipt, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Stat } from '@/components/Stat';
import { Card, Chip, ErrorNote, ListItem, Loading, Row, Screen, Txt } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';

type Dash = { kpis: Record<string, { value: number; change: number | null }>; totals: { vendors: number; products: number; agents: number; users: number; pendingApprovals: number } };

export default function AdminHome() {
  const c = useColors('shop');
  const [days, setDays] = useState(30);
  const q = useGet<Dash>(['admin-dash', days], `/api/admin/analytics?days=${days}`);
  const payouts = useGet<{ withdrawals: { status: string }[] }>(['admin-payouts'], '/api/admin/payouts');
  const waitingPayouts = payouts.data?.withdrawals.filter((w) => w.status === 'awaiting_approval' || w.status === 'awaiting_otp').length ?? 0;
  const d = q.data;
  const change = (k: string) => {
    const ch = d?.kpis[k]?.change;
    return ch == null ? '' : ` (${ch >= 0 ? '+' : ''}${Math.round(ch)}%)`;
  };
  const chev = <ChevronRight color={c.muted} size={18} />;
  const icon = (I: typeof Users) => <I color={c.text} size={20} />;
  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={() => { q.refetch(); payouts.refetch(); }}>
      <Stack.Screen options={{ title: 'Admin' }} />
      <Row style={{ marginBottom: 12 }}>
        {[7, 30, 90].map((n) => <Chip side="shop" key={n} label={`${n} days`} active={days === n} onPress={() => setDays(n)} />)}
      </Row>
      {q.isLoading ? <Loading /> : null}
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {d ? (
        <Row style={{ flexWrap: 'wrap' }} gap={10}>
          <Stat side="shop" label={`Sales${change('gmv')}`} value={naira(d.kpis.gmv?.value)} />
          <Stat side="shop" label={`Orders${change('orders')}`} value={d.kpis.orders?.value ?? 0} />
          <Stat side="shop" label={`Sign-ups${change('signups')}`} value={d.kpis.signups?.value ?? 0} />
          <Stat side="shop" label="Wallet top-ups" value={naira(d.kpis.walletFunded?.value)} />
        </Row>
      ) : null}
      <Card side="shop" style={{ marginTop: 16 }}>
        <ListItem icon={icon(BadgeCheck)} title="Verifications" detail={d ? `${d.totals.pendingApprovals} waiting` : undefined} onPress={() => router.push('/admin/verifications')} right={chev} />
        <ListItem icon={icon(Landmark)} title="Payouts" detail={waitingPayouts ? `${waitingPayouts} need you` : 'Withdrawals to banks'} onPress={() => router.push('/admin/payouts')} right={chev} />
        <ListItem icon={icon(Receipt)} title="Orders" onPress={() => router.push('/admin/orders')} right={chev} />
        <ListItem icon={icon(CalendarCheck)} title="Bookings" onPress={() => router.push('/admin/bookings')} right={chev} />
        <ListItem icon={icon(Users)} title="Users" detail={d ? `${d.totals.users} accounts` : undefined} onPress={() => router.push('/admin/users')} right={chev} />
      </Card>
      <Card side="shop" style={{ marginTop: 14 }}>
        <ListItem icon={icon(ExternalLink)} title="Full admin on the website" detail="Markets, shops, products, prices, system health" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/admin`)} />
      </Card>
      <Txt side="shop" size={12} muted style={{ marginTop: 10 }}>{d ? `${d.totals.vendors} shops · ${d.totals.products} products · ${d.totals.agents} riders` : ''}</Txt>
    </Screen>
  );
}
