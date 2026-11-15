import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { KeyRound, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Empty, ErrorNote, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { BOOKING_STATUS, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira, radius } from '@/lib/theme';

type Booking = { id: string; serviceId: string; serviceName: string; providerName: string; providerSlug: string; providerAddress: string; startsAt: string; endsAt: string; location: 'shop' | 'home'; address: string | null; note: string | null; total: number; status: string; completionCode: string; canCancelFree: boolean; respondBy: string | null; cancelReason: string | null };

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors('book');
  const qc = useQueryClient();
  const q = useGet<{ bookings: Booking[] }>(['bookings'], '/api/bookings', { refetchInterval: 30000 });
  const b = q.data?.bookings.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!b) return <Screen side="book" edges={[]}>{q.isLoading ? <Loading side="book" /> : <Empty title="Booking not found" />}</Screen>;
  const s = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
  const active = b.status === 'Requested' || b.status === 'Confirmed';

  const cancel = async () => {
    setErr(null);
    try {
      const { terms } = await api<{ terms: { late: boolean; refund: number; providerKeeps: number } }>(`/api/bookings/${id}`);
      confirmAsk(
        'Cancel this booking?',
        terms.late ? `It’s less than 24 hours away: you get ${naira(terms.refund)} back and the business keeps ${naira(terms.providerKeeps)}.` : `You get the full ${naira(terms.refund)} back in your wallet.`,
        'Cancel booking',
        async () => {
          setBusy(true);
          try {
            await api(`/api/bookings/${id}`, { body: { action: 'cancel' } });
            qc.invalidateQueries({ queryKey: ['bookings'] });
            qc.invalidateQueries({ queryKey: ['wallet'] });
          } catch (e: any) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        },
      );
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Screen side="book" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Booking' }} />
      <Pill label={s.label} tone={s.tone} />
      <Txt side="book" size={22} weight="800" style={{ marginTop: 10 }}>{b.serviceName}</Txt>
      <Txt side="book" muted>{b.providerName}</Txt>
      <Txt side="book" size={17} weight="700" style={{ marginTop: 10 }}>{when(b.startsAt)}</Txt>

      {b.status === 'Confirmed' && b.completionCode ? (
        <View style={{ backgroundColor: c.primary, borderRadius: radius.lg, padding: 18, marginTop: 16 }}>
          <Row gap={8}><KeyRound color={c.onPrimary} size={18} /><Txt color={c.onPrimary} weight="700">Your code for the end of the job</Txt></Row>
          <Txt color={c.onPrimary} size={40} weight="800" style={{ letterSpacing: 10, marginVertical: 6 }} selectable>{b.completionCode}</Txt>
          <Txt color={c.onPrimary} size={13}>Give it to {b.providerName} only when the job is done and you’re happy. It releases the payment.</Txt>
        </View>
      ) : null}
      {b.status === 'Requested' ? <Card side="book" style={{ marginTop: 16 }}><Txt side="book">Waiting for {b.providerName} to accept.{b.respondBy ? ` If they don’t reply by ${when(b.respondBy)}, you get a full refund.` : ''}</Txt></Card> : null}

      <Card side="book" style={{ marginTop: 16 }}>
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          <MapPin size={16} color={c.muted} />
          <Txt side="book" size={14} style={{ flex: 1 }}>{b.location === 'home' ? `They come to you: ${b.address}` : b.providerAddress}</Txt>
        </Row>
        {b.note ? <Txt side="book" size={14} muted style={{ marginTop: 8 }}>Your note: {b.note}</Txt> : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}><Txt side="book" muted>Paid</Txt><Txt side="book" weight="700">{naira(b.total)}</Txt></Row>
        {b.cancelReason ? <Txt side="book" size={13} muted style={{ marginTop: 8 }}>Reason: {b.cancelReason}</Txt> : null}
      </Card>
      <ErrorNote error={err ? new Error(err) : null} />
      {active ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {b.status === 'Confirmed' ? <Button side="book" kind="secondary" title="Change time" onPress={() => router.push(`/book/${b.serviceId}?provider=${b.providerSlug}&reschedule=${b.id}`)} /> : null}
          <Button side="book" kind="ghost" title="Cancel booking" loading={busy} onPress={cancel} />
        </View>
      ) : (
        <Button side="book" kind="secondary" title="Book again" style={{ marginTop: 16 }} onPress={() => router.push(`/provider/${b.providerSlug}`)} />
      )}
    </Screen>
  );
}
