import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { ProviderBadge } from '@/components/cards';
import { Button, Chip, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';
import { useColors } from '@/lib/side';

const FIELDS = ['businessName', 'category', 'tagline', 'about', 'phone', 'streetAddress', 'area', 'city', 'imageUrl', 'since'] as const;

export default function ProProfile() {
  const c = useColors('book');
  const qc = useQueryClient();
  const q = useGet<{ provider: Record<string, any> | null }>(['pro-profile'], '/api/provider/profile');
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const p = q.data?.provider;
    if (p) setF(Object.fromEntries(FIELDS.map((k) => [k, p[k] == null ? '' : String(p[k])])));
  }, [q.data]);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const photo = async () => {
    const uri = await pickPhoto({ square: true });
    if (!uri) return;
    setBusy('photo');
    try {
      const { url } = await uploadImage('/api/provider/upload', uri);
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
    setBusy('save');
    try {
      await api('/api/provider/profile', { method: 'PUT', body: { ...f, since: f.since ? Number(f.since) : null, imageUrl: f.imageUrl || null } });
      setMsg('Saved.');
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['pro-summary'] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };
  if (q.isLoading) return <Screen side="book" edges={[]}><Loading side="book" /></Screen>;
  return (
    <Screen side="book" edges={[]} footer={<Button side="book" title="Save" onPress={save} loading={busy === 'save'} />}>
      <Stack.Screen options={{ title: 'Business details' }} />
      <Row gap={14} style={{ marginBottom: 16 }}>
        <Pressable onPress={photo}><ProviderBadge name={f.businessName || '?'} imageUrl={f.imageUrl || null} size={72} /></Pressable>
        <Button side="book" small kind="ghost" title={busy === 'photo' ? 'Uploading…' : 'Change photo'} onPress={photo} />
      </Row>
      <Field side="book" label="Business name" value={f.businessName} onChangeText={set('businessName')} hint="Changing it changes your public link" />
      <Txt side="book" size={13} weight="600" style={{ marginBottom: 6 }}>Category</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {SERVICE_CATEGORIES.map((k) => <Chip side="book" key={k.id} label={k.label} active={f.category === k.id} onPress={() => set('category')(k.id)} />)}
      </ScrollView>
      <Field side="book" label="Tagline" value={f.tagline} onChangeText={set('tagline')} maxLength={120} />
      <Field side="book" label="About" value={f.about} onChangeText={set('about')} multiline />
      <Field side="book" label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field side="book" label="Street address" value={f.streetAddress} onChangeText={set('streetAddress')} hint="Only shown to customers who book you" />
      <Field side="book" label="Area" value={f.area} onChangeText={set('area')} />
      <Field side="book" label="City" value={f.city} onChangeText={set('city')} />
      <Field side="book" label="In business since (year)" value={f.since} onChangeText={(t) => set('since')(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
      {msg ? <Txt side="book" color={c.success}>{msg}</Txt> : null}
      {err ? <Txt side="book" color={c.danger}>{err}</Txt> : null}
    </Screen>
  );
}
