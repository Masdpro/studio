import { Stack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Clock, MapPin, Phone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ProductCard, useGridWidth } from '@/components/cards';
import { Chip, Empty, ErrorNote, H1, Img, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { useShop } from '@/lib/shop';
import { useColors } from '@/lib/side';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useShop(id);
  const c = useColors('shop');
  const w = useGridWidth();
  const [branch, setBranch] = useState<string>('all');
  const v = q.data?.vendor;
  const products = useMemo(() => (q.data?.products ?? []).filter((p) => branch === 'all' || (branch === 'main' ? !p.branchId : p.branchId === branch)), [q.data, branch]);
  return (
    <Screen side="shop" edges={[]} padded={false} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: v?.businessName ?? 'Shop' }} />
      {q.isLoading ? <Loading side="shop" /> : null}
      <View style={{ paddingHorizontal: 16 }}>
        <ErrorNote error={q.error} onRetry={q.refetch} />
      </View>
      {v ? (
        <View>
          {v.imageUrl ? <Img uri={v.imageUrl} style={{ width: '100%', height: 180 }} radius={0} /> : null}
          <View style={{ padding: 16, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H1 side="shop" style={{ flex: 1, fontSize: 22 }}>{v.businessName}</H1>
              {v.status ? <Pill label={v.status} tone={v.status === 'Open' ? 'good' : 'warn'} /> : null}
            </Row>
            <Row gap={6}><MapPin size={14} color={c.muted} /><Txt side="shop" size={14} muted style={{ flex: 1 }}>{v.streetAddress}, {v.city}</Txt></Row>
            {v.operatingHours ? <Row gap={6}><Clock size={14} color={c.muted} /><Txt side="shop" size={14} muted>{v.operatingHours}</Txt></Row> : null}
            {v.phone ? (
              <Row gap={6}>
                <Phone size={14} color={c.muted} />
                <Txt side="shop" size={14} muted style={{ flex: 1 }}>{v.phone}</Txt>
                <Chip side="shop" label="Call" onPress={() => Linking.openURL(`tel:${v.phone}`)} />
              </Row>
            ) : null}
            {q.data!.branches.length ? (
              <Row style={{ flexWrap: 'wrap', rowGap: 8, marginTop: 8 }}>
                <Chip side="shop" label="All" active={branch === 'all'} onPress={() => setBranch('all')} />
                <Chip side="shop" label="Main shop" active={branch === 'main'} onPress={() => setBranch('main')} />
                {q.data!.branches.map((b) => <Chip side="shop" key={b.id} label={b.name} active={branch === b.id} onPress={() => setBranch(b.id)} />)}
              </Row>
            ) : null}
          </View>
          <Row gap={12} style={{ flexWrap: 'wrap', paddingHorizontal: 16, rowGap: 16, alignItems: 'flex-start' }}>
            {products.map((p) => <ProductCard key={p.id} p={p} width={w} />)}
          </Row>
          {!products.length ? <Empty title="No products here yet" /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
