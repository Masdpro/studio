import { router, Stack } from 'expo-router';
import { CalendarCheck, ChevronRight, Clock, Scissors, Store, Wallet } from 'lucide-react-native';
import { QuickTour, TourButton, useQuickTour } from '@/components/QuickTour';
import { ApprovalBanner, Stat } from '@/components/Stat';
import { Card, ErrorNote, ListItem, Loading, Row, Screen, Txt } from '@/components/ui';
import { useRoleApproval } from '@/lib/business';
import { when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';

type Summary = { provider: { businessName: string; slug: string }; services: number; servicesWithoutPhotos: number; requests: number; upcoming: { id: string; serviceName: string; startsAt: number; status: string }[]; completedThisMonth: number; earnedThisMonth: number };

export default function ProHome() {
  const c = useColors('book');
  const tour = useQuickTour('provider');
  const approval = useRoleApproval('provider');
  const q = useGet<{ summary: Summary }>(['pro-summary'], '/api/provider/summary', { refetchInterval: 30000 });
  const s = q.data?.summary;
  const chev = <ChevronRight color={c.muted} size={18} />;
  const icon = (I: typeof Clock) => <I color={c.text} size={20} />;
  return (
    <Screen side="book" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: s?.provider.businessName ?? 'My business', headerStyle: { backgroundColor: c.bg }, headerTintColor: c.text, headerRight: () => <TourButton kind="provider" /> }} />
      <QuickTour kind="provider" visible={tour.open} onClose={tour.close} />
      {q.isLoading ? <Loading side="book" /> : null}
      <ErrorNote error={q.error} onRetry={q.refetch} />
      <ApprovalBanner side="book" status={approval?.approvalStatus} note={approval?.approvalNote} onPress={() => router.push('/verification')} />
      {s ? (
        <>
          <Row style={{ flexWrap: 'wrap', marginTop: 12 }} gap={10}>
            <Stat side="book" label="To answer" value={s.requests} tone={s.requests ? 'warn' : undefined} />
            <Stat side="book" label="Earned this month" value={naira(s.earnedThisMonth)} />
            <Stat side="book" label="Jobs done this month" value={s.completedThisMonth} />
            <Stat side="book" label="Services live" value={s.services} />
          </Row>
          {s.upcoming.length ? (
            <Card side="book" style={{ marginTop: 16 }}>
              <Txt side="book" weight="700" muted size={12} style={{ marginBottom: 6 }}>COMING UP</Txt>
              {s.upcoming.map((b) => (
                <ListItem key={b.id} title={b.serviceName} detail={`${when(b.startsAt)}${b.status === 'Requested' ? ' · needs your answer' : ''}`} onPress={() => router.push('/pro/bookings')} right={chev} />
              ))}
            </Card>
          ) : null}
          {s.servicesWithoutPhotos ? <Txt side="book" muted size={13} style={{ marginTop: 12 }}>{s.servicesWithoutPhotos} service{s.servicesWithoutPhotos === 1 ? ' has' : 's have'} no photos yet. Customers book more when they can see your work.</Txt> : null}
          <Card side="book" style={{ marginTop: 16 }}>
            <ListItem icon={icon(CalendarCheck)} title="Bookings" detail={s.requests ? `${s.requests} waiting for you` : 'Accept, finish and manage'} onPress={() => router.push('/pro/bookings')} right={chev} />
            <ListItem icon={icon(Scissors)} title="Services and photos" onPress={() => router.push('/pro/services')} right={chev} />
            <ListItem icon={icon(Clock)} title="Opening hours and days off" onPress={() => router.push('/pro/hours')} right={chev} />
            <ListItem icon={icon(Store)} title="Business details" onPress={() => router.push('/pro/profile')} right={chev} />
            <ListItem icon={icon(Wallet)} title="Earnings and withdrawals" onPress={() => router.push('/withdraw')} right={chev} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
