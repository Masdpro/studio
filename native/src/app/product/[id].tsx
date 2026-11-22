import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Minus, Plus, Store, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { percentOff, priceOf, RegisteredBadge } from '@/components/cards';
import { Button, Chip, Empty, IconButton, Img, Loading, Row, Screen, Txt, H1 } from '@/components/ui';
import { useCart } from '@/lib/cart';
import { initials } from '@/lib/service-categories';
import { stockFor, useProduct } from '@/lib/shop';
import { useColors } from '@/lib/side';
import { naira, radius } from '@/lib/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  const c = useColors('shop');
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Txt side="shop" size={12} weight="700">{title}</Txt>
        <Txt side="shop" size={11} muted>{body}</Txt>
      </View>
    </View>
  );
}

export default function ProductScreen() {
  const { id, vendor: vendorParam } = useLocalSearchParams<{ id: string; vendor?: string }>();
  const { product: p, vendor, loading } = useProduct(id, vendorParam);
  const c = useColors('shop');
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [color, setColor] = useState<string>();
  const [size, setSize] = useState<string>();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photo, setPhoto] = useState(0);

  if (!p)
    return (
      <Screen side="shop" edges={[]}>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        {loading ? <Loading /> : <Empty title="Product not found" body="It may have sold out or been removed." />}
      </Screen>
    );

  const photos = [p.imageUrl, ...(p.galleryImages ?? [])].filter(Boolean);
  const left = stockFor(p, color, size);
  const needColor = !!p.colors?.length && !color;
  const needSize = !!p.sizes?.length && !size;
  const out = left === 0;
  const off = percentOff(p);
  const heroH = Math.min(width, 520) * 1.0;

  const add = () => {
    cart.add(p, qty, { color, size, max: left });
    setAdded(true);
  };

  return (
    <Screen
      side="shop"
      edges={[]}
      padded={false}
      style={{ paddingTop: 0 }}
      footer={
        added ? (
          <Row>
            <Button kind="ghost" side="shop" title="Keep shopping" style={{ flex: 1 }} onPress={() => setAdded(false)} />
            <Button side="shop" kind="accent" title="View cart" style={{ flex: 1 }} onPress={() => router.navigate('/cart')} />
          </Row>
        ) : (
          <Row gap={12}>
            <View style={{ height: 52, borderRadius: 16, backgroundColor: c.soft, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Fewer" onPress={() => setQty(Math.max(1, qty - 1))} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={18} color={c.text} />
              </Pressable>
              <Txt side="shop" size={16} weight="800" style={{ minWidth: 22, textAlign: 'center' }}>{qty}</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => setQty(left != null ? Math.max(1, Math.min(left, qty + 1)) : qty + 1)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} color={c.text} />
              </Pressable>
            </View>
            <Button
              side="shop"
              kind="accent"
              style={{ flex: 1 }}
              title={out ? 'Sold out' : needColor ? 'Choose a colour' : needSize ? 'Choose a size' : `Add to cart · ${naira(priceOf(p) * qty)}`}
              disabled={out || needColor || needSize}
              onPress={add}
            />
          </Row>
        )
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ height: heroH, backgroundColor: c.soft }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {photos.map((u, i) => (
            <Img key={i} uri={u} style={{ width, height: heroH }} radius={0} />
          ))}
        </ScrollView>
        <View style={{ position: 'absolute', top: insets.top + 10, left: 20 }}>
          <IconButton glass side="shop" label="Back" icon={<ArrowLeft size={20} color={c.text} />} onPress={goBack} />
        </View>
        {photos.length > 1 ? (
          <Row gap={6} style={{ position: 'absolute', bottom: 46, left: 0, right: 0, justifyContent: 'center' }}>
            {photos.map((_, i) => (
              <View key={i} style={{ width: i === photo ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === photo ? c.primary : 'rgba(251,251,239,0.8)' }} />
            ))}
          </Row>
        ) : null}
      </View>

      <View style={{ marginTop: -28, backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, gap: 18 }}>
        {vendor ? (
          <Row gap={10}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={13} weight="800" color={c.onPrimary}>{initials(vendor.businessName)}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Row gap={4}>
                <Txt side="shop" size={13} weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>{vendor.businessName}</Txt>
                {vendor.registered ? <RegisteredBadge compact /> : null}
              </Row>
              <Txt side="shop" size={11} muted numberOfLines={1}>{[vendor.streetAddress, vendor.city].filter(Boolean).join(', ')}</Txt>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/store/${vendor.id}`)} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, justifyContent: 'center' }}>
              <Txt side="shop" size={12} weight="700">Visit shop</Txt>
            </Pressable>
          </Row>
        ) : null}

        <View style={{ gap: 6 }}>
          <H1 side="shop" style={{ fontSize: 26, lineHeight: 31 }}>{p.name}</H1>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Txt side="shop" size={24} weight="800" color={c.primary}>{naira(priceOf(p))}</Txt>
            {off ? <Txt side="shop" size={14} muted style={{ textDecorationLine: 'line-through' }}>{naira(p.price)}</Txt> : null}
            {off ? (
              <View style={{ backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Txt size={11} weight="800" color={c.onPrimary}>Awoof {off}</Txt>
              </View>
            ) : null}
          </Row>
          {left != null && left > 0 && left <= (p.lowStockAt ?? 5) ? <Txt side="shop" color={c.danger} size={13} weight="600">Only {left} left</Txt> : null}
        </View>

        {p.colors?.length ? (
          <View style={{ gap: 8 }}>
            <Txt side="shop" size={13} weight="700">Colour</Txt>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }} gap={0}>
              {p.colors.map((x) => <Chip side="shop" key={x} label={x} active={color === x} onPress={() => { setColor(x); setQty(1); }} />)}
            </Row>
          </View>
        ) : null}
        {p.sizes?.length ? (
          <View style={{ gap: 8 }}>
            <Txt side="shop" size={13} weight="700">Size</Txt>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }} gap={0}>
              {p.sizes.map((x) => <Chip side="shop" key={x} label={x} active={size === x} onPress={() => { setSize(x); setQty(1); }} />)}
            </Row>
          </View>
        ) : null}

        {p.description ? <Txt side="shop" size={14} muted style={{ lineHeight: 22 }}>{p.description}</Txt> : null}

        <Row gap={10}>
          <Tile icon={<Truck size={20} color={c.text} />} title="Delivery" body="A rider brings it to you" />
          <Tile icon={<Store size={20} color={c.text} />} title="Pickup" body="Collect from the shop" />
        </Row>
      </View>
      <View style={{ height: 8, borderRadius: radius.sm }} />
    </Screen>
  );
}
