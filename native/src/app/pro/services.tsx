import { router, Stack, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Button, Card, Empty, ErrorNote, Img, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import type { ProService } from '@/lib/types';

export default function ProServices() {
  const c = useColors('book');
  const q = useGet<{ services: ProService[] }>(['pro-services'], '/api/provider/services');
  useFocusEffect(useCallback(() => void q.refetch(), [])); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen side="book" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Services' }} />
      <Button side="book" title="Add a service" icon={<Plus color={c.onPrimary} size={18} />} onPress={() => router.push('/pro/service/new')} />
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading side="book" /> : null}
      {q.data && !q.data.services.length ? <Empty title="No services yet" body="Add what you can be booked for, with a price and how long it takes." /> : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        {q.data?.services.map((s) => (
          <Card side="book" key={s.id} onPress={() => router.push(`/pro/service/${s.id}`)}>
            <Row gap={12}>
              <Img uri={s.portfolio[0]?.imageUrl} style={{ width: 60, height: 60, opacity: s.paused ? 0.5 : 1 }} />
              <View style={{ flex: 1 }}>
                <Txt side="book" weight="700">{s.name}</Txt>
                <Txt side="book" size={13} muted>{s.priceFrom ? 'from ' : ''}{naira(s.price)} · {duration(s.durationMin)} · {s.portfolio.length} photos</Txt>
                {s.paused ? <Pill label="Paused" /> : null}
              </View>
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
