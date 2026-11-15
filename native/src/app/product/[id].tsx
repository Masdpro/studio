import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Minus, Plus, Store } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { priceOf } from '@/components/cards';
import { Button, Chip, Empty, Img, Loading, Pill, Row, Screen, Txt, H1 } from '@/components/ui';
import { useCart } from '@/lib/cart';
import { stockFor, useProduct } from '@/lib/shop';
import { useColors } from '@/lib/side';
import { naira, radius } from '@/lib/theme';

export default function ProductScreen() {
  const { id, vendor: vendorParam } = useLocalSearchParams<{ id: string; vendor?: string }>();
  const { product: p, vendor, loading } = useProduct(id, vendorParam);
  const c = useColors('shop');
  const cart = useCart();
  const { width } = useWindowDimensions();
  const [color, setColor] = useState<string>();
  const [size, setSize] = useState<string>();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photo, setPhoto] = useState(0);

  if (!p) return <Screen side="shop" edges={[]}>{loading ? <Loading /> : <Empty title="Product not found" body="It may have sold out or been removed." />}</Screen>;

  const photos = [p.imageUrl, ...(p.galleryImages ?? [])].filter(Boolean);
  const left = stockFor(p, color, size);
  const needColor = !!p.colors?.length && !color;
  const needSize = !!p.sizes?.length && !size;
  const out = left === 0;
  const sale = p.isAwoof && p.discountPrice && p.discountPrice < p.price;

  const add = () => {
    cart.add(p, qty, { color, size, max: left });
    setAdded(true);
  };

  return (
    <Screen
      side="shop"
      edges={[]}
      padded={false}
      footer={
        added ? (
          <Row>
            <Button kind="ghost" side="shop" title="Keep shopping" style={{ flex: 1 }} onPress={() => setAdded(false)} />
            <Button side="shop" title="View cart" style={{ flex: 1 }} onPress={() => router.navigate('/cart')} />
          </Row>
        ) : (
          <Button side="shop" title={out ? 'Sold out' : needColor ? 'Choose a colour' : needSize ? 'Choose a size' : `Add to cart · ${naira(priceOf(p) * qty)}`} disabled={out || needColor || needSize} onPress={add} />
        )
      }
    >
      <Stack.Screen options={{ title: '' }} />
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {photos.map((u, i) => (
          <Img key={i} uri={u} style={{ width, height: width }} radius={0} />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <Row gap={6} style={{ justifyContent: 'center', marginTop: 8 }}>
          {photos.map((_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === photo ? c.primary : c.border }} />
          ))}
        </Row>
      ) : null}
      <View style={{ padding: 16, gap: 8 }}>
        {sale ? <Pill label="Awoof deal" tone="warn" /> : null}
        <H1 side="shop" style={{ fontSize: 22 }}>{p.name}</H1>
        <Row>
          <Txt side="shop" size={24} weight="800">{naira(priceOf(p))}</Txt>
          {sale ? <Txt side="shop" muted style={{ textDecorationLine: 'line-through' }}>{naira(p.price)}</Txt> : null}
        </Row>
        {left != null && left > 0 && left <= (p.lowStockAt ?? 5) ? <Txt side="shop" color={c.danger} size={13} weight="600">Only {left} left</Txt> : null}
        {vendor ? (
          <Pressable onPress={() => router.push(`/store/${vendor.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border }}>
            <Store color={c.text} size={18} />
            <View style={{ flex: 1 }}>
              <Txt side="shop" weight="700">{vendor.businessName}</Txt>
              <Txt side="shop" size={12} muted>{vendor.streetAddress}, {vendor.city}</Txt>
            </View>
            <Txt side="shop" size={13} weight="600" color="#d9623a">Visit shop</Txt>
          </Pressable>
        ) : null}
        {p.colors?.length ? (
          <View>
            <Txt side="shop" weight="700" style={{ marginVertical: 6 }}>Colour</Txt>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
              {p.colors.map((x) => <Chip side="shop" key={x} label={x} active={color === x} onPress={() => { setColor(x); setQty(1); }} />)}
            </Row>
          </View>
        ) : null}
        {p.sizes?.length ? (
          <View>
            <Txt side="shop" weight="700" style={{ marginVertical: 6 }}>Size</Txt>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
              {p.sizes.map((x) => <Chip side="shop" key={x} label={x} active={size === x} onPress={() => { setSize(x); setQty(1); }} />)}
            </Row>
          </View>
        ) : null}
        <Row style={{ marginTop: 6 }} gap={16}>
          <Txt side="shop" weight="700">Quantity</Txt>
          <Pressable accessibilityLabel="Fewer" onPress={() => setQty(Math.max(1, qty - 1))} style={{ backgroundColor: c.soft, borderRadius: 8, padding: 8 }}><Minus size={16} color={c.text} /></Pressable>
          <Txt side="shop" weight="800" size={17}>{qty}</Txt>
          <Pressable accessibilityLabel="More" onPress={() => setQty(left != null ? Math.min(left, qty + 1) : qty + 1)} style={{ backgroundColor: c.soft, borderRadius: 8, padding: 8 }}><Plus size={16} color={c.text} /></Pressable>
        </Row>
        {p.description ? (
          <View style={{ marginTop: 10 }}>
            <Txt side="shop" weight="700" style={{ marginBottom: 4 }}>About this product</Txt>
            <Txt side="shop" muted>{p.description}</Txt>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
