import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, Loading, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';

export default function DeleteAccount() {
  const { c } = useSide();
  const { signOut } = useSession();
  const q = useGet<{ blockers: string[] }>(['delete-blockers'], '/api/account/delete');
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const blockers = reasons.length ? reasons : q.data?.blockers ?? [];

  const del = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api('/api/account/delete', { body: { password } });
      await signOut();
      router.dismissAll();
      router.replace('/');
    } catch (e: any) {
      setErr(e.message);
      if (Array.isArray(e.data?.reasons)) setReasons(e.data.reasons);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <Txt weight="700" size={18}>This can’t be undone</Txt>
      <Txt muted style={{ marginTop: 8 }}>
        Your name, email, phone, addresses, bank account, ID documents and notifications are wiped, and you can’t sign in again. Records of past orders, bookings and payments are kept without your details, as the law requires.
      </Txt>
      {q.isLoading ? <Loading /> : null}
      {blockers.length ? (
        <Card style={{ marginTop: 16, borderColor: c.danger }}>
          <Txt weight="700" style={{ marginBottom: 6 }}>Finish these first</Txt>
          {blockers.map((b) => <Txt key={b} size={14} style={{ marginBottom: 4 }}>• {b}</Txt>)}
        </Card>
      ) : q.data ? (
        <View style={{ marginTop: 16 }}>
          <Field label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" />
          <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry />
          {err ? <Txt color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
          <Button kind="danger" title="Delete my account" onPress={del} loading={busy} disabled={typed !== 'DELETE' || !password} />
        </View>
      ) : null}
    </Screen>
  );
}
