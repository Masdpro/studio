import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Empty, ErrorNote, Loading, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { appRouteFor } from '@/lib/links';
import { useGet } from '@/lib/query';
import { useSide } from '@/lib/side';
import type { Notification } from '@/lib/types';

export default function Notifications() {
  const { c } = useSide();
  const qc = useQueryClient();
  const q = useGet<{ notifications: Notification[] }>(['notifications'], '/api/notifications');
  const list = [...(q.data?.notifications ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const unread = list.some((n) => !n.read);
  const open = async (n: Notification) => {
    if (!n.read) api(`/api/notifications/${n.id}`, { method: 'PATCH' }).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })).catch(() => {});
    const to = appRouteFor(n.link);
    if (to) router.push(to as any);
  };
  return (
    <Screen edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      {unread ? <Button small kind="ghost" title="Mark all as read" style={{ alignSelf: 'flex-end', marginBottom: 8 }} onPress={() => api('/api/notifications', { method: 'PATCH' }).then(() => q.refetch())} /> : null}
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="You’re all caught up" /> : null}
      {list.map((n) => (
        <Pressable key={n.id} onPress={() => open(n)} style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border, opacity: pressed ? 0.6 : 1 })}>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read ? 'transparent' : c.primary }} />
            <View style={{ flex: 1 }}>
              <Txt weight={n.read ? '400' : '600'}>{n.message}</Txt>
              <Txt size={12} muted style={{ marginTop: 2 }}>{ago(n.createdAt)}</Txt>
            </View>
          </Row>
        </Pressable>
      ))}
    </Screen>
  );
}
