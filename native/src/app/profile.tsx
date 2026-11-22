import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorNote, Field, Loading, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const DETAIL_RULES = { name: rules.personName, address: rules.optional(rules.streetAddress) };
const PASSWORD_RULES = { current: (v: string) => (v ? null : 'Enter your current password.'), next: rules.newPassword };

type Profile = { name: string; email: string; phone: string; phoneVerified: boolean; address: string };

export default function ProfileScreen() {
  const { c } = useSide();
  const { refresh } = useSession();
  const q = useGet<{ profile?: Profile } & Partial<Profile>>(['profile'], '/api/account/profile');
  const p: Profile | undefined = (q.data?.profile ?? (q.data as Profile | undefined)) || undefined;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const details = useFieldChecks<'name' | 'address'>(DETAIL_RULES);
  const pw = useFieldChecks<'current' | 'next'>(PASSWORD_RULES);
  useEffect(() => {
    if (p) {
      setName(p.name);
      setAddress(p.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = async (what: 'details' | 'password') => {
    setErr(null);
    setMsg(null);
    if (what === 'details' ? !details.validateAll({ name, address }) : !pw.validateAll({ current, next })) return;
    if (what === 'password' && current === next) return setErr('The new password must be different from your current one.');
    setBusy(what);
    try {
      await api('/api/account/profile', { method: 'PATCH', body: what === 'details' ? { name, address } : { currentPassword: current, newPassword: next } });
      setMsg(what === 'details' ? 'Saved.' : 'Password changed.');
      setCurrent('');
      setNext('');
      refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Profile' }} />
      {q.isLoading ? <Loading /> : null}
      {p ? (
        <>
          <Card>
            <Field label="Name" value={name} onChangeText={(v) => { setName(v); details.changed('name', v); }} onBlur={() => details.blur('name', name)} error={details.error('name')} autoComplete="name" />
            <Field label="Email" value={p.email} editable={false} />
            <Field label="Phone" value={p.phone} editable={false} hint={p.phone ? (p.phoneVerified ? 'Confirmed' : 'Not confirmed yet') : undefined} />
            <Field label="Home address" value={address} onChangeText={(v) => { setAddress(v); details.changed('address', v); }} onBlur={() => details.blur('address', address)} error={details.error('address')} multiline style={{ minHeight: 60 }} hint="Used as your default delivery address" />
            <Button title="Save" onPress={() => save('details')} loading={busy === 'details'} disabled={details.hasErrors} />
          </Card>
          <Card style={{ marginTop: 14 }}>
            <Txt weight="700" style={{ marginBottom: 10 }}>Change password</Txt>
            <Field label="Current password" value={current} onChangeText={(v) => { setCurrent(v); pw.changed('current', v); }} onBlur={() => pw.blur('current', current)} error={pw.error('current')} secureTextEntry autoComplete="current-password" />
            <Field label="New password" value={next} onChangeText={(v) => { setNext(v); pw.changed('next', v); }} onBlur={() => pw.blur('next', next)} error={pw.error('next')} secureTextEntry hint="At least 8 characters" autoComplete="new-password" />
            <Button kind="secondary" title="Change password" onPress={() => save('password')} loading={busy === 'password'} disabled={pw.hasErrors} />
          </Card>
        </>
      ) : null}
      {msg ? <Txt color={c.success} style={{ marginTop: 12 }}>{msg}</Txt> : null}
      <ErrorNote error={err ? new Error(err) : q.error} />
    </Screen>
  );
}
