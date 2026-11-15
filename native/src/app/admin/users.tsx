import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonSheet } from '@/components/ReasonSheet';
import { Button, Card, Empty, ErrorNote, Field, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsk } from '@/lib/confirm';
import { day } from '@/lib/format';
import { useGet } from '@/lib/query';

type U = { id: string; email: string; name: string; phone: string; roles: string[]; suspended: boolean; suspendedReason: string; createdAt: string; emailVerified: boolean };

export default function AdminUsers() {
  const q = useGet<{ users: U[] }>(['admin-users'], '/api/admin/users');
  const [find, setFind] = useState('');
  const [suspend, setSuspend] = useState<U | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const f = find.trim().toLowerCase();
  const list = (q.data?.users ?? []).filter((u) => !f || `${u.email} ${u.name} ${u.phone}`.toLowerCase().includes(f));
  const patch = async (u: U, body: Record<string, unknown>) => {
    await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body });
    await q.refetch();
  };
  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Users' }} />
      <Field side="shop" value={find} onChangeText={setFind} placeholder="Search name, email or phone" autoCapitalize="none" />
      <ErrorNote error={err ? new Error(err) : q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="No one found" /> : null}
      <View style={{ gap: 10 }}>
        {list.slice(0, 80).map((u) => (
          <Card side="shop" key={u.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt side="shop" weight="700" style={{ flex: 1 }} numberOfLines={1}>{u.name || u.email}</Txt>
              {u.suspended ? <Pill label="Suspended" tone="bad" /> : null}
            </Row>
            <Txt side="shop" size={13} muted>{u.email}{u.phone ? ` · ${u.phone}` : ''}</Txt>
            <Txt side="shop" size={13} muted>{u.roles.join(', ')} · joined {day(u.createdAt)}</Txt>
            {u.suspended && u.suspendedReason ? <Txt side="shop" size={13}>Reason: {u.suspendedReason}</Txt> : null}
            {!u.roles.includes('admin') ? (
              u.suspended ? (
                <Button side="shop" small kind="ghost" title="Restore" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => confirmAsk('Restore this account?', u.email, 'Restore', () => patch(u, { suspended: false }).catch((e) => setErr(e.message)))} />
              ) : (
                <Button side="shop" small kind="ghost" title="Suspend" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => setSuspend(u)} />
              )
            ) : null}
          </Card>
        ))}
      </View>
      <ReasonSheet title={`Suspend ${suspend?.email ?? ''}`} label="Reason" action="Suspend account" danger visible={!!suspend} onClose={() => setSuspend(null)} onSubmit={(reason) => patch(suspend!, { suspended: true, reason })} />
    </Screen>
  );
}
