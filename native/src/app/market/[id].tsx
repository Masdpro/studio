import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Card, Empty, Img, Loading, Row, Screen, Txt } from '@/components/ui';
import { useCatalog } from '@/lib/query';

export default function MarketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, refetch, isRefetching } = useCatalog();
  const m = data?.markets.find((x) => x.id === id);
  const vendors = new Map((data?.vendors ?? []).map((v) => [v.id, v]));
  const stores = [
    ...(data?.vendors ?? []).filter((v) => v.marketId === id).map((v) => ({ key: v.id, vendorId: v.id, name: v.businessName, image: v.imageUrl, where: `${v.streetAddress}, ${v.city}`, hours: v.operatingHours })),
    ...(data?.branches ?? []).filter((b) => b.marketId === id && vendors.get(b.vendorId)).map((b) => ({ key: b.id, vendorId: b.vendorId, name: `${vendors.get(b.vendorId)!.businessName} · ${b.name}`, image: b.imageUrl, where: `${b.streetAddress}, ${b.city}`, hours: b.operatingHours })),
  ];
  return (
    <Screen side="shop" edges={[]} padded={false} refreshing={isRefetching} onRefresh={refetch}>
      <Stack.Screen options={{ title: m?.name ?? 'Market' }} />
      {isLoading ? <Loading /> : null}
      {m ? <Img uri={m.imageUrl} style={{ width: '100%', height: 170 }} radius={0} /> : null}
      <View style={{ padding: 16 }}>
        {m?.description ? <Txt side="shop" muted style={{ marginBottom: 12 }}>{m.description}</Txt> : null}
        {stores.map((s) => (
          <Card side="shop" key={s.key} style={{ marginBottom: 10 }} onPress={() => router.push(`/store/${s.vendorId}`)}>
            <Row gap={12}>
              <Img uri={s.image} style={{ width: 60, height: 60 }} />
              <View style={{ flex: 1 }}>
                <Txt side="shop" weight="700">{s.name}</Txt>
                <Txt side="shop" size={13} muted numberOfLines={1}>{s.where}</Txt>
                {s.hours ? <Txt side="shop" size={12} muted>{s.hours}</Txt> : null}
              </View>
            </Row>
          </Card>
        ))}
        {!isLoading && !stores.length ? <Empty title="No shops listed in this market yet" /> : null}
      </View>
    </Screen>
  );
}
