import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, ErrorNote, Field, Loading, Pill, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { day } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useSide } from '@/lib/side';
import { naira } from '@/lib/theme';

type Payouts = {
  earner: boolean;
  summary?: { balance: number; totalEarned: number; totalWithdrawn: number; withdrawable: number };
  bankAccount?: { bankName: string; accountName: string; accountNumber: string } | null;
  blockReason?: string | null;
  minWithdrawal?: number;
  withdrawals?: { id: string; amount: number; fee: number; net: number; status: string; failureReason: string | null; bankName: string; accountNumber: string; createdAt: number }[];
};

const STATUS: Record<string, string> = { awaiting_approval: 'Waiting for approval', awaiting_otp: 'Being sent', pending: 'Being sent', success: 'Paid', failed: 'Failed', reversed: 'Returned', rejected: 'Declined' };

export default function Withdraw() {
  const { c } = useSide();
  const q = useGet<Payouts>(['payouts'], '/api/wallet/payouts');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const d = q.data;

  const withdraw = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ withdrawal: { net: number } }>('/api/wallet/withdraw', { body: { amount: Number(amount) } });
      setMsg(`Requested. ${naira(r.withdrawal.net)} will be sent to your bank once approved.`);
      setAmount('');
      q.refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Withdraw earnings' }} />
      {q.isLoading ? <Loading /> : null}
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {d && !d.earner ? <Txt muted>Withdrawals are for shops, service businesses and riders.</Txt> : null}
      {d?.summary ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Txt muted size={13}>You can withdraw</Txt>
            <Txt size={30} weight="800">{naira(d.summary.withdrawable)}</Txt>
            <Txt muted size={13}>Earned {naira(d.summary.totalEarned)} · Paid out {naira(d.summary.totalWithdrawn)}</Txt>
          </Card>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt weight="700">Bank account</Txt>
              <Button small kind="ghost" title={d.bankAccount ? 'Change' : 'Add'} onPress={() => setBankOpen(true)} />
            </Row>
            {d.bankAccount ? <Txt muted style={{ marginTop: 6 }}>{d.bankAccount.accountName} · {d.bankAccount.bankName} {d.bankAccount.accountNumber}</Txt> : <Txt muted style={{ marginTop: 6 }}>Add the account to pay your earnings into.</Txt>}
          </Card>
          {d.blockReason ? <Card><Txt>{d.blockReason}</Txt></Card> : (
            <Card>
              <Field label="Amount (₦)" value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} keyboardType="number-pad" hint={`Minimum ${naira(d.minWithdrawal ?? 1000)}`} />
              <Button title="Withdraw" onPress={withdraw} loading={busy} disabled={!(Number(amount) >= (d.minWithdrawal ?? 1000)) || Number(amount) > d.summary.withdrawable} />
            </Card>
          )}
          {msg ? <Txt color={c.success}>{msg}</Txt> : null}
          <ErrorNote error={err ? new Error(err) : null} />
          {d.withdrawals?.length ? <Txt weight="700" muted size={12}>RECENT</Txt> : null}
          {d.withdrawals?.map((w) => (
            <Row key={w.id} style={{ justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border, paddingBottom: 10 }}>
              <View>
                <Txt weight="600">{naira(w.net)}</Txt>
                <Txt size={12} muted>{day(w.createdAt)} · {w.bankName} {w.accountNumber}</Txt>
                {w.failureReason ? <Txt size={12} color={c.danger}>{w.failureReason}</Txt> : null}
              </View>
              <Pill label={STATUS[w.status] ?? w.status} tone={w.status === 'success' ? 'good' : ['failed', 'reversed', 'rejected'].includes(w.status) ? 'bad' : 'warn'} />
            </Row>
          ))}
        </View>
      ) : null}
      <BankSheet visible={bankOpen} onClose={() => setBankOpen(false)} onSaved={() => { setBankOpen(false); q.refetch(); }} />
    </Screen>
  );
}

function BankSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { c } = useSide();
  const banks = useGet<{ banks: { name: string; code: string }[] }>(['banks'], visible ? '/api/banks' : null);
  const [filter, setFilter] = useState('');
  const [bank, setBank] = useState<{ name: string; code: string } | null>(null);
  const [num, setNum] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shown = (banks.data?.banks ?? []).filter((b) => b.name.toLowerCase().includes(filter.toLowerCase())).slice(0, 30);

  const check = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ accountName: string }>('/api/wallet/bank-account/resolve', { body: { bankCode: bank!.code, accountNumber: num } });
      setName(r.accountName);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api('/api/wallet/bank-account', { method: 'PUT', body: { bankCode: bank!.code, accountNumber: num, password } });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Payout bank account">
      {!bank ? (
        <>
          <Field label="Find your bank" value={filter} onChangeText={setFilter} />
          {banks.isLoading ? <Loading /> : null}
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
              {shown.map((b) => <Chip key={b.code} label={b.name} onPress={() => setBank(b)} />)}
            </Row>
          </ScrollView>
        </>
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <Txt weight="700">{bank.name}</Txt>
            <Button small kind="ghost" title="Change bank" onPress={() => { setBank(null); setName(null); }} />
          </Row>
          <Field label="Account number" value={num} onChangeText={(t) => { setNum(t.replace(/\D/g, '').slice(0, 10)); setName(null); }} keyboardType="number-pad" />
          {name ? (
            <>
              <Txt weight="700" color={c.success} style={{ marginBottom: 10 }}>{name}</Txt>
              <Field label="Your Closebuy password" value={password} onChangeText={setPassword} secureTextEntry hint="To protect your earnings" />
              <Button title="Save account" onPress={save} loading={busy} disabled={!password} />
            </>
          ) : (
            <Button title="Check account" onPress={check} loading={busy} disabled={num.length !== 10} />
          )}
        </>
      )}
      {err ? <Txt color={c.danger} style={{ marginTop: 10 }}>{err}</Txt> : null}
    </Sheet>
  );
}
