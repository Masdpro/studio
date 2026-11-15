import { router } from 'expo-router';
import { Clock, MapPin, Star } from 'lucide-react-native';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useColors } from '@/lib/side';
import { categoryLabel, hueFor, initials } from '@/lib/service-categories';
import { naira, radius } from '@/lib/theme';
import type { Product, PublicProvider, Vendor } from '@/lib/types';
import { Img, Pill, Row, Txt } from './ui';

export const priceOf = (p: Product) => (p.isAwoof && p.discountPrice ? p.discountPrice : p.price);

export function useGridWidth(cols = 2, pad = 16, gap = 12) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 720);
  return Math.floor((w - pad * 2 - gap * (cols - 1)) / cols);
}

export function ProductCard({ p, vendor, width }: { p: Product; vendor?: Vendor; width: number }) {
  const c = useColors('shop');
  const sale = p.isAwoof && p.discountPrice && p.discountPrice < p.price;
  const out = p.stock === 0;
  return (
    <Pressable onPress={() => router.push(`/product/${p.id}?vendor=${p.vendorId}`)} style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1 })}>
      <View>
        <Img uri={p.imageUrl} style={{ width, height: width, opacity: out ? 0.5 : 1 }} radius={radius.lg} />
        {sale ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Txt size={11} weight="800" color="#fff">AWOOF</Txt>
          </View>
        ) : null}
        {out ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Pill label="Sold out" tone="bad" />
          </View>
        ) : null}
      </View>
      <Txt size={14} weight="600" numberOfLines={2} side="shop" style={{ marginTop: 6 }}>{p.name}</Txt>
      <Row gap={6}>
        <Txt size={15} weight="800" side="shop">{naira(priceOf(p))}</Txt>
        {sale ? <Txt size={12} muted side="shop" style={{ textDecorationLine: 'line-through' }}>{naira(p.price)}</Txt> : null}
      </Row>
      {vendor ? <Txt size={12} muted side="shop" numberOfLines={1}>{vendor.businessName}</Txt> : null}
    </Pressable>
  );
}

export function ProviderBadge({ name, imageUrl, size = 52 }: { name: string; imageUrl?: string | null; size?: number }) {
  if (imageUrl) return <Img uri={imageUrl} style={{ width: size, height: size }} radius={size / 2} />;
  const h = hueFor(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${h}, 35%, 28%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.36} weight="800" color="#fff">{initials(name)}</Txt>
    </View>
  );
}

export function ProviderCard({ p }: { p: PublicProvider }) {
  const c = useColors('book');
  const from = Math.min(...p.services.map((s) => s.price));
  const cover = p.services.find((s) => s.cover)?.cover;
  return (
    <Pressable onPress={() => router.push(`/provider/${p.slug}`)} style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden', marginBottom: 14, opacity: pressed ? 0.85 : 1 })}>
      {cover ? <Img uri={cover} style={{ width: '100%', height: 140 }} radius={0} /> : <View style={{ height: 8, backgroundColor: `hsl(${hueFor(p.businessName)}, 30%, 22%)` }} />}
      <View style={{ padding: 14, gap: 6 }}>
        <Row gap={12}>
          <ProviderBadge name={p.businessName} imageUrl={p.imageUrl} size={44} />
          <View style={{ flex: 1 }}>
            <Txt side="book" size={16} weight="700" numberOfLines={1}>{p.businessName}</Txt>
            <Txt side="book" size={13} muted numberOfLines={1}>{categoryLabel(p.category)} · {p.area}, {p.city}</Txt>
          </View>
        </Row>
        {p.tagline ? <Txt side="book" size={14} numberOfLines={2}>{p.tagline}</Txt> : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Row gap={6}>
            <Clock size={14} color={p.nextFree?.today ? c.success : c.muted} />
            <Txt side="book" size={13} color={p.nextFree?.today ? c.success : c.muted}>{p.nextFree ? `Free ${p.nextFree.label}` : 'Fully booked this week'}</Txt>
          </Row>
          <Txt side="book" size={13} weight="700">from {naira(from)}</Txt>
        </Row>
        {p.instantBooking ? (
          <Row gap={6}>
            <Star size={13} color={c.primary} />
            <Txt side="book" size={12} muted>Instant booking</Txt>
          </Row>
        ) : null}
      </View>
    </Pressable>
  );
}

export function StoreCard({ v, onPress }: { v: Vendor; onPress?: () => void }) {
  const c = useColors('shop');
  return (
    <Pressable onPress={onPress ?? (() => router.push(`/store/${v.id}`))} style={({ pressed }) => ({ width: 150, marginRight: 12, opacity: pressed ? 0.85 : 1 })}>
      <Img uri={v.imageUrl} style={{ width: 150, height: 100 }} radius={radius.lg} />
      <Txt size={14} weight="700" side="shop" numberOfLines={1} style={{ marginTop: 6 }}>{v.businessName}</Txt>
      <Row gap={4}>
        <MapPin size={12} color={c.muted} />
        <Txt size={12} muted side="shop" numberOfLines={1} style={{ flex: 1 }}>{v.city}</Txt>
      </Row>
    </Pressable>
  );
}
