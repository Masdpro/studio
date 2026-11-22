import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Chip, Empty, ErrorNote, Field, Img, Loading, Pill, Row, Screen, Sheet, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { day } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

// Needed only to send an application back.
const REJECT_RULES = { note: rules.text('a note telling them what to fix', 5, 300) };

type Acc = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  role: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNote: string | null;
  requiredDocuments: { kind: string; label: string; uploaded: boolean; id: string | null; live: boolean }[];
  readyForReview: boolean;
  liveCheck: { id: string; frameCount: number } | null;
};
const ROLE: Record<string, string> = { vendor: 'Shop', delivery_agent: 'Rider', provider: 'Service business' };

export default function AdminVerifications() {
  const c = useColors('shop');
  const qc = useQueryClient();
  const q = useGet<{ accounts: Acc[] }>(['admin-verifications'], '/api/admin/verifications');
  const [filter, setFilter] = useState<'pending' | 'rejected' | 'approved'>('pending');
  const [open, setOpen] = useState<Acc | null>(null);
  const [note, setNote] = useState('');
  const noteChecks = useFieldChecks<'note'>(REJECT_RULES);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const list = (q.data?.accounts ?? []).filter((a) => a.approvalStatus === filter);

  const act = async (action: 'approve' | 'reject') => {
    if (!open) return;
    setErr(null);
    setBusy(action);
    try {
      await api(`/api/admin/verifications/${open.id}`, { method: 'PATCH', body: { action, note: note || undefined, role: open.role } });
      setOpen(null);
      setNote('');
      q.refetch();
      qc.invalidateQueries({ queryKey: ['admin-dash'] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Verifications' }} />
      <Row style={{ marginBottom: 12 }}>
        {(['pending', 'rejected', 'approved'] as const).map((f) => <Chip side="shop" key={f} label={`${f[0].toUpperCase()}${f.slice(1)} (${q.data?.accounts.filter((a) => a.approvalStatus === f).length ?? 0})`} active={filter === f} onPress={() => setFilter(f)} />)}
      </Row>
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {q.isLoading ? <Loading /> : null}
      {q.data && !list.length ? <Empty title="Nothing here" /> : null}
      <View style={{ gap: 10 }}>
        {list.map((a) => (
          <Card side="shop" key={a.id + a.role} onPress={() => { setOpen(a); setNote(''); setErr(null); }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt side="shop" weight="700" style={{ flex: 1 }}>{a.name}</Txt>
              <Pill label={ROLE[a.role] ?? a.role} />
            </Row>
            <Txt side="shop" size={13} muted>{a.email} · joined {day(a.createdAt)}</Txt>
            <Txt side="shop" size={13} color={a.readyForReview ? c.success : c.muted}>{a.readyForReview ? 'Ready to review' : 'Still filling in'}</Txt>
          </Card>
        ))}
      </View>
      <Sheet side="shop" visible={!!open} onClose={() => setOpen(null)} title={open ? `${open.name} · ${ROLE[open.role] ?? open.role}` : ''}>
        {open ? (
          <>
            <Txt side="shop" size={14}>{open.email} {open.emailVerified ? '(confirmed)' : '(not confirmed)'}</Txt>
            <Txt side="shop" size={14}>{open.phone ?? 'No phone'} {open.phone ? (open.phoneVerified ? '(confirmed)' : '(not confirmed)') : ''}</Txt>
            {open.requiredDocuments.map((d) => (
              <View key={d.kind} style={{ marginTop: 10 }}>
                <Row gap={8}>
                  {d.uploaded ? <CheckCircle2 size={18} color={c.success} /> : <Circle size={18} color={c.muted} />}
                  <Txt side="shop" weight="600">{d.label}</Txt>
                </Row>
                {d.id ? (
                  <Pressable onPress={() => setPhoto(`/api/account/documents/${d.id}`)}>
                    <Img auth uri={`/api/account/documents/${d.id}`} style={{ width: '100%', height: 180, marginTop: 6 }} contentFit="contain" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {open.liveCheck ? (
              <View style={{ marginTop: 12 }}>
                <Txt side="shop" weight="600">Live selfie check</Txt>
                <ScrollView horizontal style={{ marginTop: 6 }}>
                  {Array.from({ length: open.liveCheck.frameCount }, (_, n) => (
                    <Pressable key={n} onPress={() => setPhoto(`/api/account/liveness/${open.liveCheck!.id}/frames/${n}`)}>
                      <Img auth uri={`/api/account/liveness/${open.liveCheck!.id}/frames/${n}`} style={{ width: 100, height: 130, marginRight: 8 }} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {open.approvalNote ? <Txt side="shop" size={13} muted style={{ marginTop: 10 }}>Last note: {open.approvalNote}</Txt> : null}
            <Field side="shop" label="Note to them (needed to reject)" value={note} onChangeText={(t) => { setNote(t); noteChecks.changed('note', t); }} error={noteChecks.error('note')} multiline style={{ minHeight: 60, marginTop: 12 }} />
            {err ? <Txt side="shop" color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
            <Row>
              <Button side="shop" title="Approve" style={{ flex: 1 }} loading={busy === 'approve'} disabled={!open.readyForReview || open.approvalStatus === 'approved'} onPress={() => act('approve')} />
              <Button side="shop" kind="danger" title="Reject" style={{ flex: 1 }} loading={busy === 'reject'} onPress={() => noteChecks.validateAll({ note }) && act('reject')} />
            </Row>
          </>
        ) : null}
      </Sheet>
      <Sheet side="shop" visible={!!photo} onClose={() => setPhoto(null)}>
        {photo ? <Img auth uri={photo} style={{ width: '100%', height: 480 }} contentFit="contain" /> : null}
      </Sheet>
    </Screen>
  );
}
