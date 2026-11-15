import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonSheet } from '@/components/ReasonSheet';
import { Button, Card, Chip, Empty, ErrorNote, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { BOOKING_STATUS, when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { naira } from '@/lib/theme';

type AB = { id: string; serviceName: string; providerName: string; startsAt: string; status: string; total: number; location: string };

export default function AdminBookings() {
  const q = useGet<{ bookings: AB[] }>(['admin-bookings'], '/api/admin/bookings');
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [act, setAct] = useState<{ b: AB; action: 'cancel' | 'complete' } | null>(null);
  const list = (q.data?.bookings ?? []).filter((b) => (tab === 'open') === ['Requested', 'Confirmed'].includes(b.status));
  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Bookings' }} />
      <Row style={{ marginBottom: 12 }}>
        <Chip side="shop" label="Open" active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip side="shop" label="Closed" active={tab === 'closed'} onPress={() => setTab('closed')} />
      </Row>
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="No bookings" /> : null}
      <View style={{ gap: 10 }}>
        {list.map((b) => {
          const s = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
          return (
            <Card side="shop" key={b.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt side="shop" weight="700" style={{ flex: 1 }}>{b.serviceName}</Txt>
                <Pill label={s.label} tone={s.tone} />
              </Row>
              <Txt side="shop" size={13} muted>{b.providerName} · {when(b.startsAt)} · {naira(b.total)}</Txt>
              {tab === 'open' ? (
                <Row style={{ marginTop: 8 }}>
                  <Button side="shop" small kind="ghost" title="Cancel, full refund" onPress={() => setAct({ b, action: 'cancel' })} />
                  {b.status === 'Confirmed' ? <Button side="shop" small kind="ghost" title="Mark done, pay business" onPress={() => setAct({ b, action: 'complete' })} /> : null}
                </Row>
              ) : null}
            </Card>
          );
        })}
      </View>
      <ReasonSheet
        title={act?.action === 'complete' ? 'Mark as done' : 'Cancel booking'}
        label="Reason (both sides will see it)"
        action={act?.action === 'complete' ? 'Mark done' : 'Cancel and refund'}
        danger={act?.action === 'cancel'}
        visible={!!act}
        onClose={() => setAct(null)}
        onSubmit={async (reason) => { await api(`/api/admin/bookings/${act!.b.id}`, { body: { action: act!.action, reason } }); await q.refetch(); }}
      />
    </Screen>
  );
}
