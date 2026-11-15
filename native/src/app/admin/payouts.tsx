import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonSheet } from '@/components/ReasonSheet';
import { Button, Card, Chip, Empty, ErrorNote, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { when } from '@/lib/format';
import { useGet } from '@/lib/query';
import { naira } from '@/lib/theme';

type W = { id: string; user: string; email: string; suspended: boolean; amount: number; fee: number; net: number; status: string; failureReason: string | null; bank: string; createdAt: number };
const STATUS: Record<string, string> = { awaiting_approval: 'Needs approval', awaiting_otp: 'Needs OTP', pending: 'Sending', success: 'Paid', failed: 'Failed', reversed: 'Returned', rejected: 'Declined' };

export default function AdminPayouts() {
  const q = useGet<{ withdrawals: W[] }>(['admin-payouts'], '/api/admin/payouts');
  const [tab, setTab] = useState<'todo' | 'all'>('todo');
  const [otpFor, setOtpFor] = useState<W | null>(null);
  const [rejectFor, setRejectFor] = useState<W | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = (q.data?.withdrawals ?? []).filter((w) => tab === 'all' || w.status === 'awaiting_approval' || w.status === 'awaiting_otp');

  const post = async (w: W, body: Record<string, unknown>) => {
    await api(`/api/admin/payouts/${w.id}`, { body });
    await q.refetch();
  };
  const run = async (w: W, body: Record<string, unknown>) => {
    setErr(null);
    setBusy(w.id);
    try {
      await post(w, body);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Payouts' }} />
      <Row style={{ marginBottom: 12 }}>
        <Chip side="shop" label="Need you" active={tab === 'todo'} onPress={() => setTab('todo')} />
        <Chip side="shop" label="All" active={tab === 'all'} onPress={() => setTab('all')} />
      </Row>
      <ErrorNote error={err ? new Error(err) : q.error} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="Nothing waiting" /> : null}
      <View style={{ gap: 10 }}>
        {list.map((w) => (
          <Card side="shop" key={w.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt side="shop" weight="700" style={{ flex: 1 }}>{w.user}</Txt>
              <Pill label={STATUS[w.status] ?? w.status} tone={w.status === 'success' ? 'good' : ['failed', 'rejected', 'reversed'].includes(w.status) ? 'bad' : 'warn'} />
            </Row>
            <Txt side="shop" size={20} weight="800" style={{ marginTop: 4 }}>{naira(w.net)}</Txt>
            <Txt side="shop" size={13} muted>Requested {naira(w.amount)}{w.fee ? `, fee ${naira(w.fee)}` : ''} · {when(w.createdAt)}</Txt>
            <Txt side="shop" size={13} muted>{w.bank}</Txt>
            {w.suspended ? <Txt side="shop" size={13} color="#a12828">Account suspended</Txt> : null}
            {w.failureReason ? <Txt side="shop" size={13} color="#a12828">{w.failureReason}</Txt> : null}
            {w.status === 'awaiting_approval' ? (
              <Row style={{ marginTop: 10 }}>
                <Button side="shop" small title="Approve and send" style={{ flex: 1 }} loading={busy === w.id} onPress={() => confirmAsk('Send this payout?', `${naira(w.net)} to ${w.bank}. Paystack may ask for an OTP next.`, 'Send', () => run(w, { action: 'approve' }))} />
                <Button side="shop" small kind="ghost" title="Decline" onPress={() => setRejectFor(w)} />
              </Row>
            ) : null}
            {w.status === 'awaiting_otp' ? (
              <Row style={{ marginTop: 10 }}>
                <Button side="shop" small title="Enter OTP" style={{ flex: 1 }} onPress={() => setOtpFor(w)} />
                <Button side="shop" small kind="ghost" title="Resend OTP" loading={busy === w.id} onPress={() => run(w, { action: 'resend' })} />
              </Row>
            ) : null}
          </Card>
        ))}
      </View>
      <ReasonSheet title="Paystack OTP" label="Code Paystack sent you" action="Confirm transfer" numeric min={4} visible={!!otpFor} onClose={() => setOtpFor(null)} onSubmit={(otp) => post(otpFor!, { action: 'otp', otp })} />
      <ReasonSheet title="Decline payout" label="Reason they will see" action="Decline and refund wallet" danger visible={!!rejectFor} onClose={() => setRejectFor(null)} onSubmit={(reason) => post(rejectFor!, { action: 'reject', reason })} />
    </Screen>
  );
}
