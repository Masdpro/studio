import { router } from 'expo-router';
import { BadgeCheck, Clock, MapPin, Zap } from 'lucide-react-native';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useColors } from '@/lib/side';
import { categoryLabel, initials } from '@/lib/service-categories';
import { naira, radius } from '@/lib/theme';
import type { Product, PublicProvider, Vendor } from '@/lib/types';
import { Img, Pill, Row, Txt } from './ui';

export const priceOf = (p: Product) => (p.isAwoof && p.discountPrice ? p.discountPrice : p.price);

/** "-16%" for an Awoof deal, or null. */
export const percentOff = (p: Product) => (p.isAwoof && p.discountPrice && p.discountPrice < p.price ? `-${Math.round((1 - p.discountPrice / p.price) * 100)}%` : null);

export function useGridWidth(cols = 2, pad = 20, gap = 12) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 720);
  return Math.floor((w - pad * 2 - gap * (cols - 1)) / cols);
}

export function ProductCard({ p, vendor, width }: { p: Product; vendor?: Vendor; width: number }) {
  const c = useColors('shop');
  const off = percentOff(p);
  const out = p.stock === 0;
  const img = width - 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${naira(priceOf(p))}`}
      onPress={() => router.push(`/product/${p.id}?vendor=${p.vendorId}`)}
      style={({ pressed }) => ({ width, backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <View>
        <Img uri={p.imageUrl} style={{ width: img, height: img * 0.92, opacity: out ? 0.5 : 1 }} radius={14} />
        {off ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Txt size={10} weight="800" color={c.onPrimary}>{off}</Txt>
          </View>
        ) : null}
        {out ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Pill label="Sold out" tone="bad" />
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 2 }}>
        <Txt size={13} weight="700" numberOfLines={2} side="shop">{p.name}</Txt>
        {vendor ? <Txt size={11} muted side="shop" numberOfLines={1}>{vendor.businessName}</Txt> : null}
        <Row gap={6} style={{ marginTop: 3 }}>
          <Txt size={14} weight="800" side="shop" color={c.primary}>{naira(priceOf(p))}</Txt>
          {off ? <Txt size={11} muted side="shop" style={{ textDecorationLine: 'line-through' }}>{naira(p.price)}</Txt> : null}
        </Row>
      </View>
    </Pressable>
  );
}

export function ProviderBadge({ name, imageUrl, size = 52, side = 'book' }: { name: string; imageUrl?: string | null; size?: number; side?: 'shop' | 'book' }) {
  const c = useColors(side);
  if (imageUrl) return <Img uri={imageUrl} style={{ width: size, height: size }} radius={size * 0.32} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: c.dark ? c.ink : c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={size * 0.34} weight="800" color={c.dark ? c.onInk : c.onPrimary}>{initials(name)}</Txt>
    </View>
  );
}

export function ProviderCard({ p }: { p: PublicProvider }) {
  const c = useColors('book');
  const from = Math.min(...p.services.map((s) => s.price));
  const cover = p.services.find((s) => s.cover)?.cover;
  const open = () => router.push(`/provider/${p.slug}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.businessName}
      onPress={open}
      style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 10, flexDirection: 'row', gap: 12, marginBottom: 12, opacity: pressed ? 0.85 : 1 })}
    >
      {cover ? <Img uri={cover} style={{ width: 96, height: 96 }} radius={16} /> : <ProviderBadge name={p.businessName} imageUrl={p.imageUrl} size={96} />}
      <View style={{ flex: 1, paddingVertical: 2, gap: 3 }}>
        <Row gap={4}>
          <Txt side="book" size={15} weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{p.businessName}</Txt>
          <BadgeCheck size={15} color={c.primary} />
        </Row>
        <Txt side="book" size={12} muted numberOfLines={1}>{categoryLabel(p.category)} · {p.area}</Txt>
        <Row gap={5}>
          <Clock size={12} color={c.muted} />
          <Txt side="book" size={12} muted numberOfLines={1}>{p.nextFree ? `Free ${p.nextFree.label}` : 'Fully booked this week'}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 'auto' }}>
          <Row gap={4}>
            {p.instantBooking ? <Zap size={12} color={c.primary} /> : null}
            <Txt side="book" size={12} weight="700">from {naira(from)}</Txt>
          </Row>
          <View style={{ backgroundColor: c.ink, borderRadius: 10, paddingHorizontal: 14, height: 32, justifyContent: 'center' }}>
            <Txt size={12} weight="800" color={c.onInk}>Book</Txt>
          </View>
        </Row>
      </View>
    </Pressable>
  );
}

export function StoreCard({ v, onPress }: { v: Vendor; onPress?: () => void }) {
  const c = useColors('shop');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={v.businessName}
      onPress={onPress ?? (() => router.push(`/store/${v.id}`))}
      style={({ pressed }) => ({ width: 152, marginRight: 12, backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: 10, gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <Img uri={v.imageUrl} style={{ width: 130, height: 78 }} radius={14} />
      <View>
        <Row gap={4}>
          <Txt size={13} weight="700" side="shop" numberOfLines={1} style={{ flexShrink: 1 }}>{v.businessName}</Txt>
          {v.registered ? <RegisteredBadge compact /> : null}
        </Row>
        <Row gap={4}>
          <MapPin size={11} color={c.muted} />
          <Txt size={11} muted side="shop" numberOfLines={1} style={{ flex: 1 }}>{v.city}</Txt>
        </Row>
      </View>
    </Pressable>
  );
}

/** "Registered business": the shop showed Closebuy its CAC registration. */
export function RegisteredBadge({ compact }: { compact?: boolean }) {
  const c = useColors('shop');
  if (compact) return <BadgeCheck size={14} color={c.primary} accessibilityLabel="Registered business" />;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, paddingHorizontal: 10, paddingVertical: 4 }}>
      <BadgeCheck size={14} color={c.primary} />
      <Txt side="shop" size={12} weight="700">Registered business</Txt>
    </View>
  );
}
