import { router } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, Clock, Dumbbell, GraduationCap, Camera, Hammer, Home as HomeIcon, PartyPopper, Scissors, Shirt, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { percentOff, ProductCard, ProviderCard, StoreCard, useGridWidth } from '@/components/cards';
import { SideSwitch } from '@/components/SideSwitch';
import { Chip, Empty, ErrorNote, IconButton, Img, Loading, Row, SearchBar, Section, Txt } from '@/components/ui';
import { BOOKING_STATUS, when } from '@/lib/format';
import { useCatalog, useGet } from '@/lib/query';
import { initials, SERVICE_CATEGORIES } from '@/lib/service-categories';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { glassShadow, radius, TAB_BAR_SPACE } from '@/lib/theme';
import type { Product } from '@/lib/types';

const PAD = 20;

function Header() {
  const { c, side } = useSide();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const notes = useGet<{ notifications: { read: boolean }[] }>(['notifications'], user ? '/api/notifications' : null);
  const unread = notes.data?.notifications.filter((n) => !n.read).length ?? 0;
  const first = user?.name?.split(' ')[0];
  const shop = side === 'shop';
  return (
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PAD, gap: 18 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt size={12} muted weight="500">{first ? `Hello, ${first}` : 'Welcome to Closebuy'}</Txt>
          <Txt size={20} weight="800" style={{ letterSpacing: -0.4 }}>{shop ? 'What do you need today?' : 'Book a pro near you'}</Txt>
        </View>
        <IconButton label={unread ? `Notifications, ${unread} unread` : 'Notifications'} badge={!!unread} icon={<Bell color={c.text} size={20} />} onPress={() => router.push(user ? '/notifications' : '/sign-in')} />
      </Row>
      <SideSwitch />
      <SearchBar
        placeholder={shop ? 'Search food, fashion, beauty…' : 'Hair, cleaning, repairs, lessons…'}
        onPress={() => router.push('/search')}
        right={
          shop ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Search and filter" onPress={() => router.push('/search')} style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal size={20} color={c.onPrimary} />
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}

/** The dark Awoof card at the top of the Shop side. */
function DealsHero({ deals, onPress }: { deals: Product[]; onPress: () => void }) {
  const { c } = useSide();
  const best = deals.reduce<string | null>((top, p) => {
    const o = percentOff(p);
    return o && (!top || parseInt(o.slice(1), 10) > parseInt(top.slice(1), 10)) ? o : top;
  }, null);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ borderRadius: radius.xl, backgroundColor: c.ink, borderWidth: 1, borderColor: c.inkBorder, ...glassShadow, padding: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 12, opacity: pressed ? 0.92 : 1 })}>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Txt size={11} weight="800" color={c.onPrimary} style={{ letterSpacing: 0.6 }}>AWOOF DEALS</Txt>
        </View>
        <Txt size={21} weight="800" color={c.onInk} style={{ letterSpacing: -0.3, lineHeight: 26 }}>Today’s best prices near you</Txt>
        <View style={{ alignSelf: 'flex-start', marginTop: 4, height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt size={13} weight="700" color={c.onPrimary}>Shop {deals.length} deals</Txt>
          <ChevronRight size={14} color={c.onPrimary} />
        </View>
      </View>
      {best ? (
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={11} weight="700" color={c.onPrimary}>up to</Txt>
          <Txt size={24} weight="800" color={c.onPrimary} style={{ letterSpacing: -0.6, lineHeight: 28 }}>{best}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

const AWOOF = '__awoof';

function ShopHome() {
  const { c } = useSide();
  const { data, isLoading, error, refetch, isRefetching } = useCatalog();
  const [cat, setCat] = useState<string | null>(null);
  const [shown, setShown] = useState(24);
  const w = useGridWidth();
  const vendorById = useMemo(() => new Map((data?.vendors ?? []).map((v) => [v.id, v])), [data]);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of data?.products ?? []) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k);
  }, [data]);
  const deals = useMemo(() => (data?.products ?? []).filter((p) => percentOff(p)), [data]);
  const list = useMemo(() => (cat === AWOOF ? deals : (data?.products ?? []).filter((p) => !cat || p.category === cat)), [data, cat, deals]);
  const rows = useMemo(() => {
    const out: (typeof list)[] = [];
    const items = list.slice(0, shown);
    for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
    return out;
  }, [list, shown]);
  const [listY, setListY] = useState(0);
  const [ref, setRef] = useState<FlatList<Product[]> | null>(null);
  const showDeals = () => {
    setCat(AWOOF);
    ref?.scrollToOffset({ offset: listY, animated: true });
  };

  return (
    <FlatList
      ref={setRef}
      data={rows}
      keyExtractor={(r) => r[0].id}
      onEndReached={() => setShown((n) => (n < list.length ? n + 24 : n))}
      onEndReachedThreshold={1.5}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.primary} colors={[c.primary]} />}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      ListHeaderComponent={
        <View>
          <Header />
          <View style={{ paddingHorizontal: PAD, paddingTop: 20 }}>
            {error ? <ErrorNote error={error} onRetry={refetch} /> : null}
            {isLoading ? <Loading /> : null}
            {deals.length ? <DealsHero deals={deals} onPress={showDeals} /> : null}
          </View>
          {data?.vendors?.length ? (
            <Section title="Shops near you" pad={PAD}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD }}>
                {data.vendors.slice(0, 30).map((v) => (
                  <StoreCard key={v.id} v={v} />
                ))}
              </ScrollView>
            </Section>
          ) : null}
          {data?.markets?.length ? (
            <Section title="Markets" pad={PAD}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD }}>
                {data.markets.map((m) => (
                  <Pressable key={m.id} accessibilityRole="button" onPress={() => router.push(`/market/${m.id}`)} style={{ marginRight: 12, width: 220 }}>
                    <Img uri={m.imageUrl} style={{ width: 220, height: 120 }} radius={radius.lg} />
                    <Txt weight="700" size={14} style={{ marginTop: 8 }} numberOfLines={1}>{m.name}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          ) : null}
          <View onLayout={(e) => setListY(e.nativeEvent.layout.y)}>
            <Section title={cat === AWOOF ? 'Awoof deals' : 'Popular now'} pad={PAD}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD }} style={{ marginBottom: 14 }}>
                <Chip label="All" active={!cat} onPress={() => setCat(null)} />
                {deals.length ? <Chip label="Awoof" active={cat === AWOOF} onPress={() => setCat(cat === AWOOF ? null : AWOOF)} /> : null}
                {categories.map((k) => (
                  <Chip key={k} label={k} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
                ))}
              </ScrollView>
            </Section>
          </View>
          {!isLoading && !list.length ? <Empty title="No products yet" body="Check back soon." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Row gap={12} style={{ paddingHorizontal: PAD, marginBottom: 12, alignItems: 'stretch' }}>
          {item.map((p) => (
            <ProductCard key={p.id} p={p} vendor={vendorById.get(p.vendorId)} width={w} />
          ))}
        </Row>
      )}
    />
  );
}

type BookingView = { id: string; serviceName: string; providerName: string; startsAt: string; status: string };

/** The silver card showing the customer's next booking. */
function NextBooking() {
  const { c } = useSide();
  const { user } = useSession();
  const q = useGet<{ bookings: BookingView[] }>(['bookings'], user ? '/api/bookings' : null);
  const next = (q.data?.bookings ?? []).filter((b) => ['Requested', 'Confirmed'].includes(b.status)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];
  if (!next) return null;
  const s = BOOKING_STATUS[next.status]?.label ?? next.status;
  const [date, time] = when(next.startsAt).split(/,\s*/);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/booking/${next.id}`)} style={({ pressed }) => ({ borderRadius: radius.xl, backgroundColor: c.ink, padding: 18, gap: 14, opacity: pressed ? 0.92 : 1 })}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt size={11} weight="800" color={c.onInk} style={{ letterSpacing: 0.8 }}>NEXT APPOINTMENT</Txt>
        <View style={{ backgroundColor: c.onInk, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Txt size={11} weight="700" color={c.ink}>{s}</Txt>
        </View>
      </Row>
      <Row gap={12}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={16} weight="800" color={c.primary}>{initials(next.providerName)}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="800" color={c.onInk} numberOfLines={1}>{next.serviceName}</Txt>
          <Txt size={12} weight="600" color={c.onInk} numberOfLines={1}>{next.providerName}</Txt>
        </View>
      </Row>
      <Row gap={8}>
        <View style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(11,13,19,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <CalendarDays size={15} color={c.onInk} />
          <Txt size={13} weight="700" color={c.onInk}>{date}</Txt>
        </View>
        {time ? (
          <View style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(11,13,19,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Clock size={15} color={c.onInk} />
            <Txt size={13} weight="700" color={c.onInk}>{time}</Txt>
          </View>
        ) : null}
      </Row>
    </Pressable>
  );
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  beauty: Scissors,
  repairs: Hammer,
  home: HomeIcon,
  tailoring: Shirt,
  events: PartyPopper,
  fitness: Dumbbell,
  lessons: GraduationCap,
  photo: Camera,
  other: Sparkles,
};
const SHORT: Record<string, string> = { beauty: 'Beauty', repairs: 'Repairs', home: 'Home', tailoring: 'Tailoring', events: 'Events', fitness: 'Fitness', lessons: 'Lessons', photo: 'Photos', other: 'Other' };

function BookHome() {
  const { data, isLoading, error, refetch, isRefetching } = useCatalog();
  const { c } = useSide();
  const [cat, setCat] = useState<string | null>(null);
  const providers = useMemo(() => (data?.providers ?? []).filter((p) => !cat || p.category === cat), [data, cat]);
  const used = new Set((data?.providers ?? []).map((p) => p.category));
  const cats = SERVICE_CATEGORIES.filter((k) => used.has(k.id));
  return (
    <FlatList
      data={providers}
      keyExtractor={(p) => p.id}
      style={{ backgroundColor: c.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.primary} colors={[c.primary]} />}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      ListHeaderComponent={
        <View>
          <Header />
          <View style={{ paddingHorizontal: PAD, paddingTop: 20, gap: 20 }}>
            {error ? <ErrorNote error={error} onRetry={refetch} /> : null}
            {isLoading ? <Loading /> : null}
            <NextBooking />
            {cats.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
                {cats.map((k) => {
                  const Icon = CATEGORY_ICON[k.id] ?? Sparkles;
                  const on = cat === k.id;
                  return (
                    <Pressable key={k.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={k.label} onPress={() => setCat(on ? null : k.id)} style={{ width: '25%', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: on ? c.ink : c.card, borderWidth: 1, borderColor: on ? c.ink : c.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={24} color={on ? c.onInk : c.primary} strokeWidth={1.8} />
                      </View>
                      <Txt size={11} weight={on ? '700' : '600'}>{SHORT[k.id] ?? k.label}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <Section title={cat ? SERVICE_CATEGORIES.find((k) => k.id === cat)?.label ?? 'Businesses' : 'Top businesses near you'} pad={PAD}>
            {!isLoading && !providers.length ? <Empty title="No businesses here yet" body="New service businesses are joining every week." /> : null}
          </Section>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: PAD }}>
          <ProviderCard p={item} />
        </View>
      )}
    />
  );
}

export default function Home() {
  const { side, c } = useSide();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{side === 'shop' ? <ShopHome /> : <BookHome />}</View>;
}
