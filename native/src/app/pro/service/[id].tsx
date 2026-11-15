import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ImagePlus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { Button, Chip, Field, Img, Row, Screen, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { duration } from '@/lib/format';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { radius } from '@/lib/theme';
import type { ProService } from '@/lib/types';

const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

export default function EditService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const c = useColors('book');
  const qc = useQueryClient();
  const q = useGet<{ services: ProService[] }>(['pro-services'], '/api/provider/services');
  const s = q.data?.services.find((x) => x.id === id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceFrom, setPriceFrom] = useState(false);
  const [dur, setDur] = useState(60);
  const [where, setWhere] = useState<'shop' | 'home' | 'either'>('shop');
  const [fee, setFee] = useState('');
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!s) return;
    setName(s.name);
    setDescription(s.description ?? '');
    setPrice(String(s.price));
    setPriceFrom(s.priceFrom);
    setDur(s.durationMin);
    setWhere(s.location);
    setFee(s.callOutFee ? String(s.callOutFee) : '');
    setPaused(s.paused);
  }, [s]);

  const save = async () => {
    setErr(null);
    setBusy('save');
    const body = { name, description, price: Number(price), priceFrom, durationMin: dur, location: where, callOutFee: where === 'shop' ? null : Number(fee || 0), paused };
    try {
      if (isNew) {
        const r = await api<{ service: { id: string } }>('/api/provider/services', { body });
        qc.invalidateQueries({ queryKey: ['pro-services'] });
        router.replace(`/pro/service/${r.service.id}`);
      } else {
        await api(`/api/provider/services/${id}`, { method: 'PATCH', body });
        qc.invalidateQueries({ queryKey: ['pro-services'] });
        qc.invalidateQueries({ queryKey: ['catalog'] });
        router.back();
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const addPhoto = async () => {
    const uri = await pickPhoto({});
    if (!uri) return;
    setErr(null);
    setBusy('photo');
    try {
      const { url } = await uploadImage('/api/provider/upload', uri);
      await api(`/api/provider/services/${id}/portfolio`, { body: { imageUrl: url } });
      q.refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };
  const removePhoto = (itemId: string) =>
    confirmAsk('Remove this photo?', '', 'Remove', async () => {
      await api(`/api/provider/portfolio/${itemId}`, { method: 'DELETE' }).catch((e) => setErr(e.message));
      q.refetch();
    });
  const remove = () =>
    confirmAsk('Remove this service?', 'If it has upcoming bookings it’s paused instead.', 'Remove', async () => {
      try {
        await api(`/api/provider/services/${id}`, { method: 'DELETE' });
        qc.invalidateQueries({ queryKey: ['pro-services'] });
        router.back();
      } catch (e: any) {
        setErr(e.message);
      }
    });

  return (
    <Screen side="book" edges={[]} footer={<Button side="book" title={isNew ? 'Add service' : 'Save'} onPress={save} loading={busy === 'save'} disabled={name.trim().length < 2 || !(Number(price) >= 100)} />}>
      <Stack.Screen options={{ title: isNew ? 'New service' : 'Edit service' }} />
      <Field side="book" label="Service name" value={name} onChangeText={setName} placeholder="e.g. Knotless braids, medium" />
      <Field side="book" label="Description" value={description} onChangeText={setDescription} multiline />
      <Field side="book" label="Price (₦)" value={price} onChangeText={(t) => setPrice(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
      <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <Txt side="book" style={{ flex: 1 }}>Show as “from” price</Txt>
        <Switch value={priceFrom} onValueChange={setPriceFrom} />
      </Row>
      <Txt side="book" size={13} weight="600" style={{ marginBottom: 6 }}>How long it takes</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {DURATIONS.map((d) => <Chip side="book" key={d} label={duration(d)} active={dur === d} onPress={() => setDur(d)} />)}
      </ScrollView>
      <Txt side="book" size={13} weight="600" style={{ marginBottom: 6 }}>Where</Txt>
      <Row style={{ marginBottom: 14, flexWrap: 'wrap', rowGap: 8 }}>
        <Chip side="book" label="My place" active={where === 'shop'} onPress={() => setWhere('shop')} />
        <Chip side="book" label="Customer’s place" active={where === 'home'} onPress={() => setWhere('home')} />
        <Chip side="book" label="Either" active={where === 'either'} onPress={() => setWhere('either')} />
      </Row>
      {where !== 'shop' ? <Field side="book" label="Call-out fee for home visits (₦)" value={fee} onChangeText={(t) => setFee(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /> : null}
      {!isNew ? (
        <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <Txt side="book" style={{ flex: 1 }}>Paused (hidden from customers)</Txt>
          <Switch value={paused} onValueChange={setPaused} />
        </Row>
      ) : null}
      {!isNew && s ? (
        <View style={{ marginBottom: 14 }}>
          <Txt side="book" weight="700" style={{ marginBottom: 8 }}>Photos of your work ({s.portfolio.length}/12)</Txt>
          <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
            {s.portfolio.map((p) => (
              <View key={p.id}>
                <Img uri={p.imageUrl} style={{ width: 90, height: 90 }} />
                <Pressable accessibilityLabel="Remove photo" onPress={() => removePhoto(p.id)} style={{ position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}>
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {s.portfolio.length < 12 ? (
              <Pressable onPress={addPhoto} style={{ width: 90, height: 90, borderRadius: radius.md, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus color={c.muted} size={24} />
              </Pressable>
            ) : null}
          </Row>
          {busy === 'photo' ? <Txt side="book" muted size={13}>Uploading…</Txt> : null}
        </View>
      ) : isNew ? <Txt side="book" muted size={13} style={{ marginBottom: 14 }}>You can add photos after saving.</Txt> : null}
      {err ? <Txt side="book" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
      {!isNew ? <Button side="book" kind="ghost" title="Remove service" onPress={remove} /> : null}
    </Screen>
  );
}
