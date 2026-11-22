import { router, Stack, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { priceOf } from '@/components/cards';
import { Button, Card, Chip, Empty, ErrorNote, Img, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useGet } from '@/lib/query';
import { naira, palettes } from '@/lib/theme';
import type { Product } from '@/lib/types';

export default function VendorProducts() {
  const q = useGet<{ products: Product[] }>(['vendor-products'], '/api/vendor/products');
  const [filter, setFilter] = useState<'all' | 'live' | 'paused' | 'out'>('all');
  const [err, setErr] = useState<string | null>(null);
  useFocusEffect(useCallback(() => void q.refetch(), [])); // eslint-disable-line react-hooks/exhaustive-deps
  const list = (q.data?.products ?? []).filter((p) => (filter === 'all' ? true : filter === 'paused' ? p.paused : filter === 'out' ? p.stock === 0 : !p.paused && p.stock !== 0));
  const act = async (p: Product, action: 'pause' | 'resume' | 'sold_out') => {
    setErr(null);
    try {
      await api('/api/vendor/products/actions', { body: { ids: [p.id], action } });
      q.refetch();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Products' }} />
      <Button side="shop" title="Add a product" icon={<Plus color={palettes.shop.onPrimary} size={18} />} onPress={() => router.push('/vendor/product/new')} />
      <Row style={{ marginVertical: 12 }}>
        {(['all', 'live', 'paused', 'out'] as const).map((f) => <Chip side="shop" key={f} label={{ all: 'All', live: 'Live', paused: 'Paused', out: 'Sold out' }[f]} active={filter === f} onPress={() => setFilter(f)} />)}
      </Row>
      <ErrorNote error={err ? new Error(err) : q.error} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="No products here" /> : null}
      <View style={{ gap: 10 }}>
        {list.map((p) => (
          <Card side="shop" key={p.id} onPress={() => router.push(`/vendor/product/${p.id}`)}>
            <Row gap={12}>
              <Img uri={p.imageUrl} style={{ width: 60, height: 60, opacity: p.paused ? 0.5 : 1 }} />
              <View style={{ flex: 1 }}>
                <Txt side="shop" weight="700" numberOfLines={1}>{p.name}</Txt>
                <Txt side="shop" size={13}>{naira(priceOf(p))}{p.stock != null ? ` · ${p.stock} in stock` : ''}</Txt>
                <Row style={{ marginTop: 4 }}>
                  {p.paused ? <Pill label="Paused" /> : p.stock === 0 ? <Pill label="Sold out" tone="bad" /> : <Pill label="Live" tone="good" />}
                  {p.isAwoof ? <Pill label="Awoof" tone="warn" /> : null}
                </Row>
              </View>
              <Button side="shop" small kind="ghost" title={p.paused ? 'Resume' : 'Pause'} onPress={() => act(p, p.paused ? 'resume' : 'pause')} />
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
