import { Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Button, Card, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { day } from '@/lib/format';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { radius } from '@/lib/theme';

type Settings = { weeklyHours: Record<string, [string, string][]>; capacity: number; instantBooking: boolean; daysOff: string[] };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Hours() {
  const c = useColors('book');
  const q = useGet<{ settings: Settings }>(['pro-settings'], '/api/provider/settings');
  const [s, setS] = useState<Settings | null>(null);
  const [newOff, setNewOff] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (q.data) setS(q.data.settings);
  }, [q.data]);
  if (!s) return <Screen side="book" edges={[]}><Loading side="book" /></Screen>;

  const setDay = (d: number, periods: [string, string][]) => setS({ ...s, weeklyHours: { ...s.weeklyHours, [String(d)]: periods } });
  const time = (v: string, onChange: (t: string) => void) => (
    <TextInput value={v} onChangeText={(t) => onChange(t.replace(/[^\d:]/g, '').slice(0, 5))} placeholder="09:00" placeholderTextColor={c.muted} keyboardType="numbers-and-punctuation" style={{ color: c.text, backgroundColor: c.soft, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, width: 70, textAlign: 'center' }} />
  );

  const save = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await api<{ settings: Settings }>('/api/provider/settings', { method: 'PUT', body: s });
      setS(r.settings);
      setMsg('Saved.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen side="book" edges={[]} footer={<Button side="book" title="Save" onPress={save} loading={busy} />}>
      <Stack.Screen options={{ title: 'Hours' }} />
      <Card side="book">
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt side="book" weight="700">Instant booking</Txt>
            <Txt side="book" size={13} muted>Off: you accept each booking yourself</Txt>
          </View>
          <Switch value={s.instantBooking} onValueChange={(v) => setS({ ...s, instantBooking: v })} />
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Txt side="book" weight="700" style={{ flex: 1 }}>Customers at the same time</Txt>
          <Row gap={14}>
            <Button side="book" small kind="ghost" title="−" onPress={() => setS({ ...s, capacity: Math.max(1, s.capacity - 1) })} />
            <Txt side="book" weight="800">{s.capacity}</Txt>
            <Button side="book" small kind="ghost" title="+" onPress={() => setS({ ...s, capacity: Math.min(20, s.capacity + 1) })} />
          </Row>
        </Row>
      </Card>
      <Txt side="book" weight="700" muted size={12} style={{ marginTop: 18, marginBottom: 8 }}>OPENING HOURS</Txt>
      <Card side="book">
        {ORDER.map((d) => {
          const periods = s.weeklyHours[String(d)] ?? [];
          const open = periods.length > 0;
          return (
            <View key={d} style={{ paddingVertical: 8, borderBottomWidth: d === 0 ? 0 : 1, borderColor: c.border }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt side="book" weight="600" style={{ width: 100 }}>{DAYS[d]}</Txt>
                {open ? (
                  <Row gap={6}>
                    {time(periods[0][0], (t) => setDay(d, [[t, periods[0][1]], ...periods.slice(1)]))}
                    <Txt side="book" muted>to</Txt>
                    {time(periods[0][1], (t) => setDay(d, [[periods[0][0], t], ...periods.slice(1)]))}
                  </Row>
                ) : <Txt side="book" muted>Closed</Txt>}
                <Switch value={open} onValueChange={(v) => setDay(d, v ? [['09:00', '18:00']] : [])} />
              </Row>
              {periods.length > 1 ? <Txt side="book" size={12} muted>+ {periods.length - 1} more period(s) set on the website</Txt> : null}
            </View>
          );
        })}
      </Card>
      <Txt side="book" weight="700" muted size={12} style={{ marginTop: 18, marginBottom: 8 }}>DAYS OFF</Txt>
      <Card side="book">
        {s.daysOff.length ? s.daysOff.map((d) => (
          <Row key={d} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <Txt side="book">{day(`${d}T12:00:00+01:00`)}</Txt>
            <Pressable accessibilityLabel="Remove day off" onPress={() => setS({ ...s, daysOff: s.daysOff.filter((x) => x !== d) })}><X color={c.muted} size={18} /></Pressable>
          </Row>
        )) : <Txt side="book" muted>None</Txt>}
        <Row style={{ marginTop: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field side="book" value={newOff} onChangeText={setNewOff} placeholder="YYYY-MM-DD" /></View>
          <Button side="book" small title="Add" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(newOff)} onPress={() => { setS({ ...s, daysOff: [...new Set([...s.daysOff, newOff])].sort() }); setNewOff(''); }} />
        </Row>
      </Card>
      {msg ? <Txt side="book" color={c.success} style={{ marginTop: 10 }}>{msg}</Txt> : null}
      {err ? <Txt side="book" color={c.danger} style={{ marginTop: 10 }}>{err}</Txt> : null}
    </Screen>
  );
}
