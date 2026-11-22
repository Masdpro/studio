import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Chip, ErrorNote, Field, H1, Loading, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { naira, radius } from '@/lib/theme';
import { rules } from '@/lib/field-rules';
import { PaystackSheet, confirmPayment, type SheetResult } from '@/components/PaystackSheet';
import { useFieldChecks } from '@/lib/use-field-checks';

// Same limits as the server.
const TOPUP_RULES = { amount: rules.naira('the amount', 100, 1_000_000) };

type Entry = { id: string; type: string; amount: number; description: string | null; createdAt: number };

export default function WalletTab() {
  const { user, has } = useSession();
  const { c } = useSide();
  const qc = useQueryClient();
  const wallet = useGet<{ wallet: { balance: number } }>(['wallet'], user ? '/api/wallet' : null);
  const tx = useGet<{ entries: Entry[] }>(['wallet-tx'], user ? '/api/wallet/transactions' : null);
  const [topUp, setTopUp] = useState(false);
  const [amount, setAmount] = useState('5000');
  const checks = useFieldChecks<'amount'>(// Same limits as the server.
 TOPUP_RULES);
  const [busy, setBusy] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [payRef, setPayRef] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const earner = has('vendor') || has('provider') || has('delivery_agent');

  if (!user) return <SignInPrompt title="Your wallet" body="Sign in to top up and pay in one tap." />;

  const refresh = () => {
    wallet.refetch();
    tx.refetch();
  };

  const startTopUp = async () => {
    if (!checks.validateAll({ amount })) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const { authorizationUrl, reference } = await api<{ authorizationUrl: string; reference: string }>('/api/payments/wallet/initialize', { body: { amount: Number(amount) } });
      setTopUp(false);
      setPayRef(reference);
      setPayUrl(authorizationUrl); // Paystack opens in a sheet inside the app
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const onPaid = async (r: SheetResult) => {
    setPayUrl(null);
    try {
      if (r.status === 'cancelled' && !payRef) return;
      // Even after "cancel", check once: the payment may have gone through just before.
      const res = await confirmPayment((ref) => api(`/api/payments/wallet/verify?reference=${encodeURIComponent(ref)}`), r.status === 'done' && r.reference ? r.reference : payRef!, r.status === 'done' ? 10 : 1);
      setMsg(res.success ? `${naira(res.amount)} added to your wallet.` : r.status === 'cancelled' ? 'Top-up cancelled. You have not been charged.' : res.pending ? 'Payment not finished yet. If you paid, it will show here shortly.' : res.error ?? 'Payment was not completed.');
      qc.invalidateQueries({ queryKey: ['wallet'] });
      tx.refetch();
    } finally {
      setBusy(false);
      setPayRef(null);
    }
  };

  return (
    <Screen tabs refreshing={wallet.isRefetching} onRefresh={refresh}>
      <PaystackSheet url={payUrl} onClose={onPaid} />
      <H1>Wallet</H1>
      <View style={{ backgroundColor: c.primary, borderRadius: radius.lg, padding: 20, marginTop: 14 }}>
        <Txt color={c.onPrimary} size={14} weight="600">Balance</Txt>
        <Txt color={c.onPrimary} size={34} weight="800">{wallet.data ? naira(wallet.data.wallet.balance) : '…'}</Txt>
        <Row style={{ marginTop: 14 }}>
          <Button small kind="secondary" title="Top up" onPress={() => setTopUp(true)} />
          {earner ? <Button small kind="secondary" title="Withdraw" onPress={() => router.push('/withdraw')} /> : null}
        </Row>
      </View>
      {msg ? <Card style={{ marginTop: 12 }}><Txt>{msg}</Txt></Card> : null}
      <ErrorNote error={wallet.error} onRetry={refresh} />
      <Txt weight="700" muted style={{ marginTop: 22, marginBottom: 8 }}>HISTORY</Txt>
      {tx.isLoading ? <Loading /> : null}
      {tx.data && !tx.data.entries.length ? <Txt muted>No transactions yet.</Txt> : null}
      {tx.data?.entries.map((e) => (
        <Row key={e.id} gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}>
          {e.amount >= 0 ? <ArrowDownLeft color={c.success} size={20} /> : <ArrowUpRight color={c.muted} size={20} />}
          <View style={{ flex: 1 }}>
            <Txt size={14} numberOfLines={2}>{e.description ?? e.type}</Txt>
            <Txt size={12} muted>{ago(e.createdAt)}</Txt>
          </View>
          <Txt weight="700" color={e.amount >= 0 ? c.success : c.text}>{e.amount >= 0 ? '+' : '−'}{naira(Math.abs(e.amount))}</Txt>
        </Row>
      ))}
      <Sheet visible={topUp} onClose={() => setTopUp(false)} title="Top up your wallet">
        <Row style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {['2000', '5000', '10000', '20000'].map((a) => (
            <Chip key={a} label={naira(Number(a))} active={amount === a} onPress={() => setAmount(a)} />
          ))}
        </Row>
        <Field label="Amount (₦)" {...checks.input('amount', amount, (t) => setAmount(t.replace(/\D/g, '')))} keyboardType="number-pad" hint="Between ₦100 and ₦1,000,000. You pay securely with Paystack." />
        {err ? <Txt color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
        <Button title={`Pay ${naira(Number(amount) || 0)}`} onPress={startTopUp} loading={busy} disabled={!(Number(amount) >= 100)} />
      </Sheet>
    </Screen>
  );
}
