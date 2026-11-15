import { router } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCard, ProviderCard, StoreCard, useGridWidth } from '@/components/cards';
import { SideSwitch } from '@/components/SideSwitch';
import { Chip, Empty, ErrorNote, H1, Img, Loading, Row, Section, Txt } from '@/components/ui';
import { useCatalog, useGet } from '@/lib/query';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { radius } from '@/lib/theme';

function Header() {
  const { c, side } = useSide();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const notes = useGet<{ notifications: { read: boolean }[] }>(['notifications'], user ? '/api/notifications' : null);
  const unread = notes.data?.notifications.filter((n) => !n.read).length ?? 0;
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: c.bg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <SideSwitch />
        <Pressable accessibilityLabel="Notifications" onPress={() => router.push(user ? '/notifications' : '/sign-in')} hitSlop={10}>
          <Bell color={c.text} size={24} />
          {unread ? <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger }} /> : null}
        </Pressable>
      </Row>
      <H1 style={{ marginTop: 14 }}>{side === 'shop' ? 'What do you need today?' : 'Book a trusted pro'}</H1>
      <Pressable
        onPress={() => router.push('/search')}
        style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}
      >
        <Search color={c.muted} size={18} />
        <Txt muted>{side === 'shop' ? 'Search products and shops' : 'Search services and businesses'}</Txt>
      </Pressable>
    </View>
  );
}

function ShopHome() {
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
  const list = useMemo(() => (data?.products ?? []).filter((p) => !cat || p.category === cat), [data, cat]);
  const deals = useMemo(() => (data?.products ?? []).filter((p) => p.isAwoof && p.discountPrice), [data]);
  const rows = useMemo(() => {
    const out: (typeof list)[] = [];
    const items = list.slice(0, shown);
    for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
    return out;
  }, [list, shown]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r[0].id}
      onEndReached={() => setShown((n) => (n < list.length ? n + 24 : n))}
      onEndReachedThreshold={1.5}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#ff8f66" />}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <View>
          <Header />
          <View style={{ paddingHorizontal: 16 }}>
            {error ? <ErrorNote error={error} onRetry={refetch} /> : null}
            {isLoading ? <Loading /> : null}
            {data?.markets?.length ? (
              <Section title="Markets near you">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {data.markets.map((m) => (
                    <Pressable key={m.id} onPress={() => router.push(`/market/${m.id}`)} style={{ marginRight: 12, width: 200 }}>
                      <Img uri={m.imageUrl} style={{ width: 200, height: 110 }} radius={radius.lg} />
                      <Txt weight="700" style={{ marginTop: 6 }} numberOfLines={1}>{m.name}</Txt>
                    </Pressable>
                  ))}
                </ScrollView>
              </Section>
            ) : null}
            {deals.length ? (
              <Section title="Awoof deals">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {deals.slice(0, 20).map((p) => (
                    <View key={p.id} style={{ marginRight: 12 }}>
                      <ProductCard p={p} vendor={vendorById.get(p.vendorId)} width={150} />
                    </View>
                  ))}
                </ScrollView>
              </Section>
            ) : null}
            {data?.vendors?.length ? (
              <Section title="Shops">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {data.vendors.slice(0, 30).map((v) => (
                    <StoreCard key={v.id} v={v} />
                  ))}
                </ScrollView>
              </Section>
            ) : null}
            <Section title="All products">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <Chip label="All" active={!cat} onPress={() => setCat(null)} />
                {categories.map((k) => (
                  <Chip key={k} label={k} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
                ))}
              </ScrollView>
            </Section>
            {!isLoading && !list.length ? <Empty title="No products yet" body="Check back soon." /> : null}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Row gap={12} style={{ paddingHorizontal: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          {item.map((p) => (
            <ProductCard key={p.id} p={p} vendor={vendorById.get(p.vendorId)} width={w} />
          ))}
        </Row>
      )}
    />
  );
}

function BookHome() {
  const { data, isLoading, error, refetch, isRefetching } = useCatalog();
  const { c } = useSide();
  const [cat, setCat] = useState<string | null>(null);
  const providers = useMemo(() => (data?.providers ?? []).filter((p) => !cat || p.category === cat), [data, cat]);
  const used = new Set((data?.providers ?? []).map((p) => p.category));
  return (
    <FlatList
      data={providers}
      keyExtractor={(p) => p.id}
      style={{ backgroundColor: c.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <View>
          <Header />
          <View style={{ paddingHorizontal: 16 }}>
            {error ? <ErrorNote error={error} onRetry={refetch} /> : null}
            {isLoading ? <Loading /> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
              <Chip label="All" active={!cat} onPress={() => setCat(null)} />
              {SERVICE_CATEGORIES.filter((k) => used.has(k.id)).map((k) => (
                <Chip key={k.id} label={k.label} active={cat === k.id} onPress={() => setCat(cat === k.id ? null : k.id)} />
              ))}
            </ScrollView>
            {!isLoading && !providers.length ? <Empty title="No businesses here yet" body="New service businesses are joining every week." /> : null}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16 }}>
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
