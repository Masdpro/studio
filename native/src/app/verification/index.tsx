import { router, Stack } from 'expo-router';
import { CheckCircle2, Circle, Camera } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorNote, Field, Loading, Pill, Row, Screen, Segmented, Txt } from '@/components/ui';
import { api, uploadImage } from '@/lib/api';
import { pickPhoto } from '@/lib/pick';
import { useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useColors } from '@/lib/side';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const PHONE_RULES = { phone: rules.phone, code: rules.digits(6, 'the code from the text') };

type Doc = { kind: string; label: string; uploaded: boolean; live: boolean };
/** One way to get verified (shops: with or without CAC). */
type Route = { id: string; label: string; hint: string; documents: Doc[]; complete: boolean };
type State = {
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  phoneRequired: boolean;
  approvalStatus: string;
  approvalNote: string | null;
  tradingRoles: { role: string; label: string; approvalStatus: string; approvalNote: string | null; requiredDocuments: Doc[]; readyForReview: boolean; mayTrade: boolean; route?: string; routes?: Route[] }[];
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
  const phoneChecks = useFieldChecks<'phone' | 'code'>(PHONE_RULES);
  const [routeChoice, setRouteChoice] = useState<Record<string, string>>({});
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
    if (!phoneChecks.validateAll({ phone: phone || st?.phone || '', code: '000000' })) return;
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
    if (!phoneChecks.validateAll({ phone: '08000000000', code })) return;
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
                  <Field side="shop" label="6-digit code" {...phoneChecks.input('code', code, (t) => setCode(t.replace(/\D/g, '').slice(0, 6)))} keyboardType="number-pad" maxLength={6} />
                  <Button side="shop" small title="Confirm" onPress={confirmCode} loading={busy === 'phone'} disabled={code.length !== 6} />
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <Field side="shop" label="Mobile number" {...phoneChecks.input('phone', phone || st.phone || '', setPhone)} keyboardType="phone-pad" placeholder="08012345678" />
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
              {r.routes && r.routes.length > 1 ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Txt side="shop" size={13} weight="700">How do you want to verify?</Txt>
                  <Segmented side="shop" value={routeChoice[r.role] ?? r.route ?? r.routes[0].id} onChange={(v) => setRouteChoice((x) => ({ ...x, [r.role]: v }))} options={r.routes.map((x) => ({ value: x.id, label: x.id === 'registered' ? 'I have CAC' : 'No CAC' }))} />
                  <Txt side="shop" size={12} muted>{(r.routes.find((x) => x.id === (routeChoice[r.role] ?? r.route)) ?? r.routes[0]).hint}</Txt>
                </View>
              ) : null}
              {(r.routes && r.routes.length > 1 ? (r.routes.find((x) => x.id === (routeChoice[r.role] ?? r.route)) ?? r.routes[0]).documents : r.requiredDocuments).map((d) => (
                <View key={d.kind} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: c.border, marginTop: 8 }}>
                <Row gap={10}>
                  {d.uploaded ? <CheckCircle2 color={c.success} size={20} /> : <Circle color={c.muted} size={20} />}
                  <Txt side="shop" style={{ flex: 1 }}>{d.label}</Txt>
                  {d.live ? (
                    <Button side="shop" small kind={d.uploaded ? 'ghost' : 'primary'} title={d.uploaded ? 'Retake' : 'Start'} icon={<Camera size={14} color={d.uploaded ? c.text : c.onPrimary} />} onPress={() => router.push('/verification/selfie')} />
                  ) : (
                    <Row gap={6}>
                      <Button side="shop" small kind="ghost" title="Photo" loading={busy === d.kind} onPress={() => upload(d.kind, true)} />
                      <Button side="shop" small kind={d.uploaded ? 'ghost' : 'primary'} title={d.uploaded ? 'Replace' : 'Upload'} onPress={() => upload(d.kind, false)} />
                    </Row>
                  )}
                </Row>
                </View>
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
