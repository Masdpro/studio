import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Clock, Home, Images, MapPin, Store } from 'lucide-react-native';
import { View } from 'react-native';
import { ProviderBadge } from '@/components/cards';
import { Button, Card, Empty, H1, Img, Loading, Row, Screen, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { useCatalog } from '@/lib/query';
import { categoryLabel } from '@/lib/service-categories';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';

export default function ProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, refetch, isRefetching } = useCatalog();
  const c = useColors('book');
  const p = data?.providers.find((x) => x.slug === slug);
  if (!p) return <Screen side="book" edges={[]}>{isLoading ? <Loading side="book" /> : <Empty title="This business isn’t taking bookings right now" />}</Screen>;
  return (
    <Screen side="book" edges={[]} refreshing={isRefetching} onRefresh={refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Row gap={14}>
        <ProviderBadge name={p.businessName} imageUrl={p.imageUrl} size={64} />
        <View style={{ flex: 1 }}>
          <H1 side="book" style={{ fontSize: 22 }}>{p.businessName}</H1>
          <Txt side="book" muted size={14}>{categoryLabel(p.category)}{p.since ? ` · since ${p.since}` : ''}</Txt>
        </View>
      </Row>
      {p.tagline ? <Txt side="book" style={{ marginTop: 12 }} size={16} weight="600">{p.tagline}</Txt> : null}
      <Row gap={6} style={{ marginTop: 10 }}><MapPin size={14} color={c.muted} /><Txt side="book" size={14} muted>{p.area}, {p.city}</Txt></Row>
      <Row gap={6} style={{ marginTop: 4 }}><Clock size={14} color={p.nextFree?.today ? c.success : c.muted} /><Txt side="book" size={14} color={p.nextFree?.today ? c.success : c.muted}>{p.nextFree ? `Next free: ${p.nextFree.label}` : 'Fully booked this week'}</Txt></Row>
      {p.about ? <Txt side="book" muted style={{ marginTop: 12 }}>{p.about}</Txt> : null}
      <Txt side="book" weight="700" muted size={12} style={{ marginTop: 22, marginBottom: 8 }}>SERVICES</Txt>
      {p.services.map((s) => (
        <Card side="book" key={s.id} style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
          {s.cover ? <Img uri={s.cover} style={{ width: '100%', height: 150 }} radius={0} /> : null}
          <View style={{ padding: 14, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Txt side="book" weight="700" size={16} style={{ flex: 1 }}>{s.name}</Txt>
              <Txt side="book" weight="800" size={16}>{s.priceFrom ? 'from ' : ''}{naira(s.price)}</Txt>
            </Row>
            {s.description ? <Txt side="book" muted size={14}>{s.description}</Txt> : null}
            <Row gap={14}>
              <Row gap={4}><Clock size={13} color={c.muted} /><Txt side="book" size={13} muted>{duration(s.durationMin)}</Txt></Row>
              <Row gap={4}>
                {s.location === 'home' ? <Home size={13} color={c.muted} /> : <Store size={13} color={c.muted} />}
                <Txt side="book" size={13} muted>{s.location === 'shop' ? 'At their place' : s.location === 'home' ? `Comes to you${s.callOutFee ? ` (+${naira(s.callOutFee)})` : ''}` : 'Their place or yours'}</Txt>
              </Row>
            </Row>
            <Row style={{ marginTop: 6 }}>
              <Button side="book" small title={p.instantBooking ? 'Book' : 'Request booking'} onPress={() => router.push(`/book/${s.id}?provider=${p.slug}`)} style={{ flex: 1 }} />
              {s.portfolioCount ? <Button side="book" small kind="ghost" title={`${s.portfolioCount} photos`} icon={<Images size={16} color={c.text} />} onPress={() => router.push(`/portfolio/${s.id}`)} /> : null}
            </Row>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
