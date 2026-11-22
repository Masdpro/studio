import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ImagePlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Button, Chip, Field, Img, Loading, Screen, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { radius } from '@/lib/theme';
import type { Vendor } from '@/lib/types';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const STORE_RULES = {
  businessName: rules.businessName,
  phone: rules.phone,
  streetAddress: rules.streetAddress,
  city: rules.place,
  operatingHours: rules.maxLength(120, 'the opening hours'),
  slug: rules.optionalLinkName,
};
type Checked = keyof typeof STORE_RULES;

const STATUSES = ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] as const;

export default function VendorProfile() {
  const c = useColors('shop');
  const qc = useQueryClient();
  const q = useGet<{ vendor: (Vendor & { contactEmail?: string }) | null }>(['vendor-profile'], '/api/vendor/profile');
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const v = q.data?.vendor;
    if (v) setF({ businessName: v.businessName ?? '', phone: v.phone ?? '', streetAddress: v.streetAddress ?? '', city: v.city ?? '', operatingHours: v.operatingHours ?? '', status: v.status ?? 'Open', imageUrl: v.imageUrl ?? '', slug: v.slug ?? '' });
  }, [q.data]);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const checks = useFieldChecks<Checked>(STORE_RULES);
  const field = (k: Checked) => ({
    value: f[k],
    onChangeText: (v: string) => {
      set(k)(v);
      checks.changed(k, v);
    },
    onBlur: () => checks.blur(k, f[k] ?? ''),
    error: checks.error(k),
  });

  const photo = async () => {
    const uri = await pickPhoto({});
    if (!uri) return;
    setBusy('photo');
    try {
      const { url } = await uploadImage('/api/vendor/upload', uri);
      set('imageUrl')(url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    setErr(null);
    setMsg(null);
    if (!checks.validateAll(f)) return setErr('Some entries need fixing. Check the messages above.');
    setBusy('save');
    try {
      const { slug, ...rest } = f;
      await api('/api/vendor/profile', { body: { ...rest, ...(slug ? { slug } : {}) } });
      setMsg('Saved.');
      qc.invalidateQueries({ queryKey: ['catalog'] });
      q.refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (q.isLoading) return <Screen side="shop" edges={[]}><Loading /></Screen>;
  return (
    <Screen side="shop" edges={[]} footer={<Button side="shop" title="Save" onPress={save} loading={busy === 'save'} />}>
      <Stack.Screen options={{ title: 'Store details' }} />
      <Pressable onPress={photo} style={{ height: 150, borderRadius: radius.lg, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 }}>
        {f.imageUrl ? <Img uri={f.imageUrl} style={{ width: '100%', height: 150 }} radius={0} /> : <ImagePlus color={c.muted} size={32} />}
      </Pressable>
      {busy === 'photo' ? <Loading /> : null}
      <Field side="shop" label="Store name" {...field('businessName')} />
      <Txt side="shop" size={13} weight="600" style={{ marginBottom: 6 }}>Status</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {STATUSES.map((s) => <Chip side="shop" key={s} label={s} active={f.status === s} onPress={() => set('status')(s)} />)}
      </ScrollView>
      <Field side="shop" label="Phone" {...field('phone')} keyboardType="phone-pad" placeholder="08012345678" />
      <Field side="shop" label="Address" {...field('streetAddress')} />
      <Field side="shop" label="City" {...field('city')} />
      <Field side="shop" label="Opening hours" {...field('operatingHours')} placeholder="e.g. 9am to 7pm, Mon to Sat" />
      <Field side="shop" label="Store link name" {...field('slug')} autoCapitalize="none" hint={f.slug ? `cbuyapp.com/s/${f.slug}` : 'Your own short link to share'} />
      {msg ? <Txt side="shop" color={c.success}>{msg}</Txt> : null}
      {err ? <Txt side="shop" color={c.danger}>{err}</Txt> : null}
    </Screen>
  );
}
