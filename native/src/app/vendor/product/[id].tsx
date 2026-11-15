import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { Button, Field, Img, Row, Screen, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { radius } from '@/lib/theme';
import type { Product } from '@/lib/types';

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const c = useColors('shop');
  const qc = useQueryClient();
  const q = useGet<{ products: Product[] }>(['vendor-products'], '/api/vendor/products');
  const p = q.data?.products.find((x) => x.id === id);
  const [f, setF] = useState({ name: '', price: '', discountPrice: '', category: '', description: '', stock: '', colors: '', sizes: '' });
  const [awoof, setAwoof] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!p) return;
    setF({ name: p.name, price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : '', category: p.category ?? '', description: p.description ?? '', stock: p.stock != null ? String(p.stock) : '', colors: (p.colors ?? []).join(', '), sizes: (p.sizes ?? []).join(', ') });
    setAwoof(!!p.isAwoof);
    setImage(p.imageUrl);
    setGallery(p.galleryImages ?? []);
  }, [p]);

  const addPhoto = async (main: boolean, camera = false) => {
    const uri = await pickPhoto({ camera, square: true });
    if (!uri) return;
    setBusy(main ? 'photo' : 'gallery');
    setErr(null);
    try {
      const { url } = await uploadImage('/api/vendor/upload', uri);
      if (main) setImage(url);
      else setGallery((g) => [...g, url].slice(0, 8));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setErr(null);
    setBusy('save');
    const body: Record<string, unknown> = {
      name: f.name.trim(),
      price: Number(f.price),
      discountPrice: f.discountPrice ? Number(f.discountPrice) : null,
      isAwoof: awoof && !!f.discountPrice,
      category: f.category.trim() || undefined,
      description: f.description.trim(),
      imageUrl: image,
      galleryImages: gallery,
      colors: list(f.colors),
      sizes: list(f.sizes),
    };
    if (f.stock.trim() !== '' && !(p?.variantStock?.length)) body.stock = Number(f.stock);
    if (f.stock.trim() === '' && !isNew) body.stock = null;
    try {
      if (isNew) await api('/api/vendor/products', { body });
      else await api(`/api/products/${id}`, { method: 'PATCH', body });
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      router.back();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    confirmAsk('Delete this product?', 'It disappears from your store. Past orders keep their records.', 'Delete', async () => {
      try {
        await api(`/api/products/${id}`, { method: 'DELETE' });
        qc.invalidateQueries({ queryKey: ['vendor-products'] });
        router.back();
      } catch (e: any) {
        setErr(e.message);
      }
    });

  return (
    <Screen
      side="shop"
      edges={[]}
      footer={<Button side="shop" title={isNew ? 'Add product' : 'Save changes'} onPress={save} loading={busy === 'save'} disabled={!f.name.trim() || !(Number(f.price) > 0) || !image} />}
    >
      <Stack.Screen options={{ title: isNew ? 'New product' : 'Edit product' }} />
      <Row gap={12} style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <Pressable onPress={() => addPhoto(true)} style={{ width: 120, height: 120, borderRadius: radius.lg, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {image ? <Img uri={image} style={{ width: 120, height: 120 }} /> : <ImagePlus color={c.muted} size={32} />}
        </Pressable>
        <View style={{ flex: 1, gap: 8 }}>
          <Txt side="shop" weight="700">Main photo</Txt>
          <Button side="shop" small kind="ghost" title="Take photo" icon={<Camera size={14} color={c.text} />} loading={busy === 'photo'} onPress={() => addPhoto(true, true)} />
          <Button side="shop" small kind="ghost" title="Choose photo" onPress={() => addPhoto(true)} />
        </View>
      </Row>
      <Txt side="shop" size={13} weight="600" style={{ marginBottom: 6 }}>More photos</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {gallery.map((g) => (
          <View key={g} style={{ marginRight: 8 }}>
            <Img uri={g} style={{ width: 70, height: 70 }} />
            <Pressable accessibilityLabel="Remove photo" onPress={() => setGallery((x) => x.filter((y) => y !== g))} style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}>
              <X size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {gallery.length < 8 ? (
          <Pressable onPress={() => addPhoto(false)} style={{ width: 70, height: 70, borderRadius: radius.md, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <ImagePlus color={c.muted} size={22} />
          </Pressable>
        ) : null}
      </ScrollView>
      <Field side="shop" label="Name" value={f.name} onChangeText={set('name')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Field side="shop" label="Price (₦)" value={f.price} onChangeText={(t) => set('price')(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field side="shop" label="Stock" value={f.stock} onChangeText={(t) => set('stock')(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Not counted" editable={!p?.variantStock?.length} hint={p?.variantStock?.length ? 'Counted per colour/size on the website' : undefined} /></View>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt side="shop" weight="600">Awoof deal</Txt>
          <Txt side="shop" size={12} muted>Show a discounted price</Txt>
        </View>
        <Switch value={awoof} onValueChange={setAwoof} trackColor={{ true: c.primary }} />
      </Row>
      {awoof ? <Field side="shop" label="Deal price (₦)" value={f.discountPrice} onChangeText={(t) => set('discountPrice')(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" /> : null}
      <Field side="shop" label="Category" value={f.category} onChangeText={set('category')} placeholder="e.g. Groceries" />
      <Field side="shop" label="Description" value={f.description} onChangeText={set('description')} multiline />
      <Field side="shop" label="Colours (optional)" value={f.colors} onChangeText={set('colors')} placeholder="Red, Blue, Black" hint="Separate with commas. Customers must pick one." />
      <Field side="shop" label="Sizes (optional)" value={f.sizes} onChangeText={set('sizes')} placeholder="S, M, L" />
      {err ? <Txt side="shop" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
      {!isNew ? <Button side="shop" kind="ghost" title="Delete product" onPress={remove} /> : null}
    </Screen>
  );
}
