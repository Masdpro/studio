import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ProductCard, ProviderCard, useGridWidth } from '@/components/cards';
import { Card, Empty, Field, Row, Screen, Txt } from '@/components/ui';
import { useCatalog } from '@/lib/query';
import { categoryLabel } from '@/lib/service-categories';
import { useSide } from '@/lib/side';

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (text: string, w: string[]) => {
  const t = text.toLowerCase();
  return w.every((x) => t.includes(x));
};

export default function Search() {
  const { side } = useSide();
  const { data } = useCatalog();
  const [q, setQ] = useState('');
  const w = useGridWidth();
  const ws = words(q);
  const res = useMemo(() => {
    if (!data || !ws.length) return null;
    if (side === 'shop') {
      return {
        products: data.products.filter((p) => matches(`${p.name} ${p.category ?? ''} ${p.description}`, ws)).slice(0, 60),
        vendors: data.vendors.filter((v) => matches(`${v.businessName} ${v.city} ${v.streetAddress}`, ws)).slice(0, 10),
        providers: [],
      };
    }
    return {
      products: [],
      vendors: [],
      providers: data.providers.filter((p) => matches(`${p.businessName} ${categoryLabel(p.category)} ${p.tagline ?? ''} ${p.area} ${p.city} ${p.services.map((s) => s.name).join(' ')}`, ws)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, side]);
  const vendorById = new Map((data?.vendors ?? []).map((v) => [v.id, v]));
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Search' }} />
      <Field autoFocus value={q} onChangeText={setQ} placeholder={side === 'shop' ? 'Rice, phone charger, Ankara…' : 'Braids, plumber, tutor…'} returnKeyType="search" clearButtonMode="while-editing" />
      {res?.vendors.length ? (
        <View style={{ marginBottom: 12 }}>
          <Txt weight="700" muted size={12} style={{ marginBottom: 6 }}>SHOPS</Txt>
          {res.vendors.map((v) => (
            <Card key={v.id} style={{ marginBottom: 8 }} onPress={() => router.push(`/store/${v.id}`)}>
              <Txt weight="700">{v.businessName}</Txt>
              <Txt size={13} muted>{v.city}</Txt>
            </Card>
          ))}
        </View>
      ) : null}
      {res?.products.length ? (
        <Row gap={12} style={{ flexWrap: 'wrap', rowGap: 16, alignItems: 'flex-start' }}>
          {res.products.map((p) => <ProductCard key={p.id} p={p} vendor={vendorById.get(p.vendorId)} width={w} />)}
        </Row>
      ) : null}
      {res?.providers.map((p) => <ProviderCard key={p.id} p={p} />)}
      {res && !res.products.length && !res.vendors.length && !res.providers.length ? <Empty title="Nothing found" body="Try a different word." /> : null}
    </Screen>
  );
}
