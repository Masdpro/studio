import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Field, Loading, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';

const FIELDS = ['name', 'phone', 'streetAddress', 'city', 'vehicleDetails'] as const;

export default function AgentProfile() {
  const c = useColors('shop');
  const q = useGet<{ agent: Record<string, string> | null }>(['agent-profile'], '/api/delivery-agent/profile');
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const a = q.data?.agent;
    if (a) setF(Object.fromEntries(FIELDS.map((k) => [k, a[k] ?? ''])));
  }, [q.data]);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await api('/api/delivery-agent/profile', { body: f });
      setMsg('Saved.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (q.isLoading) return <Screen side="shop" edges={[]}><Loading /></Screen>;
  return (
    <Screen side="shop" edges={[]} footer={<Button side="shop" title="Save" onPress={save} loading={busy} />}>
      <Stack.Screen options={{ title: 'Rider profile' }} />
      <Field side="shop" label="Name" value={f.name} onChangeText={set('name')} />
      <Field side="shop" label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field side="shop" label="Address" value={f.streetAddress} onChangeText={set('streetAddress')} />
      <Field side="shop" label="City" value={f.city} onChangeText={set('city')} />
      <Field side="shop" label="Vehicle" value={f.vehicleDetails} onChangeText={set('vehicleDetails')} placeholder="e.g. Motorcycle, plate ABC123XY" />
      {msg ? <Txt side="shop" color={c.success}>{msg}</Txt> : null}
      {err ? <Txt side="shop" color={c.danger}>{err}</Txt> : null}
    </Screen>
  );
}
