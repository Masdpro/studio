import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty, ErrorNote, Img, Loading, Txt } from '@/components/ui';
import { useGet } from '@/lib/query';
import { palettes } from '@/lib/theme';

type Portfolio = { serviceName: string; providerName: string; items: { id: string; imageUrl: string; caption: string | null }[] };

export default function PortfolioScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const q = useGet<Portfolio>(['portfolio', serviceId], `/api/services/${serviceId}/portfolio`);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);
  const c = palettes.book;
  const size = Math.floor((width - 16 * 2 - 8) / 2);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: q.data?.serviceName ?? 'Photos' }} />
      {q.isLoading ? <Loading side="book" /> : null}
      <ErrorNote error={q.error} />
      <FlatList
        data={q.data?.items ?? []}
        numColumns={2}
        keyExtractor={(i) => i.id}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={q.data ? <Empty title="No photos yet" /> : undefined}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setOpen(index)}>
            <Img uri={item.imageUrl} style={{ width: size, height: size }} />
          </Pressable>
        )}
      />
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <FlatList
            data={q.data?.items ?? []}
            horizontal
            pagingEnabled
            initialScrollIndex={open ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => setOpen(null)} style={{ width, height, justifyContent: 'center' }}>
                <Img uri={item.imageUrl} style={{ width, height: height * 0.75 }} radius={0} contentFit="contain" />
                {item.caption ? <Txt side="book" center style={{ position: 'absolute', bottom: insets.bottom + 30, left: 16, right: 16 }}>{item.caption}</Txt> : null}
              </Pressable>
            )}
          />
          <Pressable onPress={() => setOpen(null)} style={{ position: 'absolute', top: insets.top + 10, right: 16, padding: 10 }}>
            <Txt side="book" weight="700" size={16}>Close</Txt>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
