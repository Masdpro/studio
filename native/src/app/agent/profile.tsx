import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Field, Loading, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const RIDER_RULES = {
  name: rules.personName,
  phone: rules.phone,
  streetAddress: rules.streetAddress,
  city: rules.place,
  vehicleDetails: rules.maxLength(80, 'the vehicle details'),
};
type Checked = keyof typeof RIDER_RULES;

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
  const checks = useFieldChecks<Checked>(RIDER_RULES);
  const field = (k: Checked) => ({
    value: f[k],
    onChangeText: (v: string) => {
      set(k)(v);
      checks.changed(k, v);
    },
    onBlur: () => checks.blur(k, f[k] ?? ''),
    error: checks.error(k),
  });
  const save = async () => {
    setErr(null);
    setMsg(null);
    if (!checks.validateAll(f)) return setErr('Some entries need fixing. Check the messages above.');
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
      <Field side="shop" label="Name" {...field('name')} />
      <Field side="shop" label="Phone" {...field('phone')} keyboardType="phone-pad" />
      <Field side="shop" label="Address" {...field('streetAddress')} />
      <Field side="shop" label="City" {...field('city')} />
      <Field side="shop" label="Vehicle" {...field('vehicleDetails')} placeholder="e.g. Motorcycle, plate ABC123XY" />
      {msg ? <Txt side="shop" color={c.success}>{msg}</Txt> : null}
      {err ? <Txt side="shop" color={c.danger}>{err}</Txt> : null}
    </Screen>
  );
}
