import { router, Stack } from 'expo-router';
import { CheckCircle2, Circle, Camera } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorNote, Field, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useColors } from '@/lib/side';

type Doc = { kind: string; label: string; uploaded: boolean; live: boolean };
type State = {
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  phoneRequired: boolean;
  approvalStatus: string;
  approvalNote: string | null;
  tradingRoles: { role: string; label: string; approvalStatus: string; approvalNote: string | null; requiredDocuments: Doc[]; readyForReview: boolean; mayTrade: boolean }[];
};

const tone = (s: string) => (s === 'approved' ? 'good' : s === 'rejected' ? 'bad' : 'warn') as 'good' | 'bad' | 'warn';
const word = (s: string) => (s === 'approved' ? 'Approved' : s === 'rejected' ? 'Needs changes' : 'In review');

export default function Verification() {
  const c = useColors('shop');
  const { refresh } = useSession();
  const q = useGet<{ state: State }>(['verification'], '/api/account/verification');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const st = q.data?.state;

  const upload = async (kind: string, camera: boolean) => {
    setErr(null);
    const uri = await pickPhoto({ camera });
    if (!uri) return;
    setBusy(kind);
    try {
      await uploadImage('/api/account/documents', uri, { kind });
      await q.refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const sendCode = async () => {
    setErr(null);
    setBusy('phone');
    try {
      const r = await api<{ phone: string; devCode?: string }>('/api/account/phone', { body: { action: 'send', phone: phone || st?.phone } });
      setCodeSent(r.devCode ? `Test code: ${r.devCode}` : `Code sent to ${r.phone}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };
  const confirmCode = async () => {
    setErr(null);
    setBusy('phone');
    try {
      await api('/api/account/phone', { body: { action: 'verify', code } });
      setCodeSent(null);
      await q.refetch();
      refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen side="shop" edges={[]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: 'Verification' }} />
      {q.isLoading ? <Loading /> : null}
      <ErrorNote error={q.error} onRetry={q.refetch} />
      {st ? (
        <View style={{ gap: 14 }}>
          <Txt side="shop" muted>Closebuy checks every business before it can trade. Upload what’s asked below; we usually review within a day.</Txt>
          {st.phoneRequired && !st.phoneVerified ? (
            <Card side="shop">
              <Txt side="shop" weight="700">Confirm your mobile number</Txt>
              {codeSent ? (
                <View style={{ marginTop: 10 }}>
                  <Txt side="shop" size={13} muted>{codeSent}</Txt>
                  <Field side="shop" label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                  <Button side="shop" small title="Confirm" onPress={confirmCode} loading={busy === 'phone'} disabled={code.length !== 6} />
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <Field side="shop" label="Mobile number" value={phone || st.phone || ''} onChangeText={setPhone} keyboardType="phone-pad" />
                  <Button side="shop" small title="Text me a code" onPress={sendCode} loading={busy === 'phone'} />
                </View>
              )}
            </Card>
          ) : null}
          {st.tradingRoles.map((r) => (
            <Card side="shop" key={r.role}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt side="shop" weight="800" size={16}>{r.label}</Txt>
                <Pill label={word(r.approvalStatus)} tone={tone(r.approvalStatus)} />
              </Row>
              {r.approvalNote ? <Txt side="shop" size={13} color={c.danger} style={{ marginTop: 6 }}>{r.approvalNote}</Txt> : null}
              {r.requiredDocuments.map((d) => (
                <Row key={d.kind} gap={10} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: c.border, marginTop: 8 }}>
                  {d.uploaded ? <CheckCircle2 color={c.success} size={20} /> : <Circle color={c.muted} size={20} />}
                  <Txt side="shop" style={{ flex: 1 }}>{d.label}</Txt>
                  {d.live ? (
                    <Button side="shop" small kind={d.uploaded ? 'ghost' : 'primary'} title={d.uploaded ? 'Retake' : 'Start'} icon={<Camera size={14} color={d.uploaded ? c.text : '#fff'} />} onPress={() => router.push('/verification/selfie')} />
                  ) : (
                    <Row gap={6}>
                      <Button side="shop" small kind="ghost" title="Photo" loading={busy === d.kind} onPress={() => upload(d.kind, true)} />
                      <Button side="shop" small kind={d.uploaded ? 'ghost' : 'primary'} title={d.uploaded ? 'Replace' : 'Upload'} onPress={() => upload(d.kind, false)} />
                    </Row>
                  )}
                </Row>
              ))}
              {r.mayTrade ? <Txt side="shop" size={13} color={c.success} style={{ marginTop: 6 }}>You can trade as {r.label.toLowerCase()}.</Txt> : r.readyForReview ? <Txt side="shop" size={13} muted style={{ marginTop: 6 }}>Everything’s in. We’ll let you know once it’s reviewed.</Txt> : null}
            </Card>
          ))}
          <ErrorNote error={err ? new Error(err) : null} />
        </View>
      ) : null}
    </Screen>
  );
}
