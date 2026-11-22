import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { BOOKING_STATUS, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const CODE_RULES = { code: rules.digits(4, "the customer's code") };

type PB = { id: string; serviceName: string; startsAt: string; endsAt: string; status: string; location: 'shop' | 'home'; address: string | null; note: string | null; price: number; total: number; customerName: string; customerPhone: string | null; respondBy: string | null };

export default function ProBookings() {
  const c = useColors('book');
  const qc = useQueryClient();
  const q = useGet<{ bookings: PB[] }>(['pro-bookings'], '/api/provider/bookings', { refetchInterval: 30000 });
  const [tab, setTab] = useState<'requests' | 'upcoming' | 'past'>('upcoming');
  const [finish, setFinish] = useState<PB | null>(null);
  const [code, setCode] = useState('');
  const checks = useFieldChecks<'code'>(CODE_RULES);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const all = q.data?.bookings ?? [];
  const requests = all.filter((b) => b.status === 'Requested');
  const upcoming = all.filter((b) => b.status === 'Confirmed').sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = all.filter((b) => !['Requested', 'Confirmed'].includes(b.status)).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const list = tab === 'requests' ? requests : tab === 'upcoming' ? upcoming : past;

  const act = async (b: PB, action: string, extra: Record<string, unknown> = {}) => {
    setErr(null);
    setBusy(b.id + action);
    try {
      await api(`/api/provider/bookings/${b.id}`, { body: { action, ...extra } });
      await q.refetch();
      qc.invalidateQueries({ queryKey: ['pro-summary'] });
      return true;
    } catch (e: any) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="book" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Bookings' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <Chip side="book" label={`Requests${requests.length ? ` (${requests.length})` : ''}`} active={tab === 'requests'} onPress={() => setTab('requests')} />
        <Chip side="book" label={`Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}`} active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
        <Chip side="book" label="Past" active={tab === 'past'} onPress={() => setTab('past')} />
      </ScrollView>
      <ErrorNote error={err ? new Error(err) : q.error} />
      {q.isLoading ? <Loading side="book" /> : null}
      {q.data && !list.length ? <Empty title="Nothing here yet" /> : null}
      <View style={{ gap: 10 }}>
        {list.map((b) => {
          const s = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
          const started = +new Date(b.startsAt) < Date.now();
          return (
            <Card side="book" key={b.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt side="book" weight="700" style={{ flex: 1 }}>{b.serviceName}</Txt>
                <Pill label={s.label} tone={s.tone} />
              </Row>
              <Txt side="book" weight="600" style={{ marginTop: 4 }}>{when(b.startsAt)}</Txt>
              <Txt side="book" size={14} muted>{b.customerName} · {naira(b.price)}</Txt>
              <Txt side="book" size={13} muted>{b.location === 'home' ? `At the customer’s: ${b.address}` : 'At your place'}</Txt>
              {b.note ? <Txt side="book" size={13} style={{ marginTop: 4 }}>“{b.note}”</Txt> : null}
              {b.customerPhone ? <Button side="book" small kind="ghost" title={`Call ${b.customerPhone}`} style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:${b.customerPhone}`)} /> : null}
              {b.status === 'Requested' ? (
                <Row style={{ marginTop: 10 }}>
                  <Button side="book" small title="Accept" style={{ flex: 1 }} loading={busy === b.id + 'accept'} onPress={() => act(b, 'accept')} />
                  <Button side="book" small kind="ghost" title="Decline" style={{ flex: 1 }} onPress={() => confirmAsk('Decline this request?', 'The customer gets a full refund.', 'Decline', () => act(b, 'decline'))} />
                </Row>
              ) : null}
              {b.status === 'Confirmed' ? (
                <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  <Button side="book" small title="Finish job" style={{ flex: 1 }} onPress={() => { setFinish(b); setCode(''); }} />
                  {started ? (
                    <Button side="book" small kind="ghost" title="No-show" onPress={() => confirmAsk('Customer didn’t turn up?', 'You keep 50% and the rest goes back to them.', 'Mark no-show', () => act(b, 'noshow'))} />
                  ) : (
                    <Button side="book" small kind="ghost" title="Cancel" onPress={() => confirmAsk('Cancel this booking?', 'The customer gets a full refund. Cancelling often hurts your ranking.', 'Cancel booking', () => act(b, 'cancel'))} />
                  )}
                </Row>
              ) : null}
            </Card>
          );
        })}
      </View>
      <Sheet side="book" visible={!!finish} onClose={() => setFinish(null)} title="Finish the job">
        <Txt side="book" muted style={{ marginBottom: 12 }}>Ask {finish?.customerName} for their 4-digit code. Entering it marks the job done and pays you.</Txt>
        <Field side="book" label="Customer’s code" {...checks.input('code', code, (t) => setCode(t.replace(/\D/g, '').slice(0, 4)))} keyboardType="number-pad" />
        {err ? <Txt side="book" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
        <Button side="book" title="Confirm" disabled={code.length !== 4} loading={!!finish && busy === finish.id + 'complete'} onPress={async () => { if (!checks.validateAll({ code })) return; if (finish && (await act(finish, 'complete', { code }))) setFinish(null); }} />
      </Sheet>
    </Screen>
  );
}
