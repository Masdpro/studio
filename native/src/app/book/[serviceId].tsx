import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Divider, Empty, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { day, duration } from '@/lib/format';
import { useCatalog, useGet } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const BOOK_RULES = { address: rules.streetAddress, note: rules.maxLength(500, 'the note') };

type Slot = { startsAt: number; label: string };

export default function BookService() {
  const { serviceId, provider: slug, reschedule } = useLocalSearchParams<{ serviceId: string; provider?: string; reschedule?: string }>();
  const c = useColors('book');
  const qc = useQueryClient();
  const { user } = useSession();
  const { data } = useCatalog();
  const p = data?.providers.find((x) => x.slug === slug || x.services.some((s) => s.id === serviceId));
  const s = p?.services.find((x) => x.id === serviceId);
  const dates = useGet<{ dates: string[] }>(['dates', serviceId], `/api/services?serviceId=${serviceId}`);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<Slot>();
  const [where, setWhere] = useState<'shop' | 'home'>('shop');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const checks = useFieldChecks<'address' | 'note'>(BOOK_RULES);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wallet = useGet<{ wallet: { balance: number } }>(['wallet'], user ? '/api/wallet' : null);
  const slots = useQuery({
    queryKey: ['slots', serviceId, date, reschedule],
    queryFn: () => api<{ slots: Slot[] }>(`/api/services/${serviceId}/slots?date=${date}${reschedule ? `&booking=${reschedule}` : ''}`),
    enabled: !!date,
  });

  useEffect(() => {
    if (!date && dates.data?.dates.length) setDate(dates.data.dates[0]);
  }, [dates.data, date]);
  useEffect(() => {
    if (s) setWhere(s.location === 'home' ? 'home' : 'shop');
  }, [s]);

  if (!s || !p) return <Screen side="book" edges={[]}>{data ? <Empty title="This service isn’t available" /> : <Loading side="book" />}</Screen>;

  const fee = where === 'home' ? s.callOutFee ?? 0 : 0;
  const total = s.price + fee;
  const balance = wallet.data?.wallet.balance;
  const short = !reschedule && balance != null && balance < total;

  const submit = async () => {
    if (!checks.validateAll({ address: !reschedule && where === 'home' ? address : '12 Not needed', note })) return;
    if (!user) return router.push('/sign-in');
    setErr(null);
    setBusy(true);
    try {
      if (reschedule) {
        await api(`/api/bookings/${reschedule}`, { body: { action: 'reschedule', startsAt: slot!.startsAt } });
        qc.invalidateQueries({ queryKey: ['bookings'] });
        qc.invalidateQueries({ queryKey: ['booking', reschedule] });
        router.back();
        return;
      }
      const { booking } = await api<{ booking: { id: string } }>('/api/bookings', { body: { serviceId, startsAt: slot!.startsAt, location: where, address: where === 'home' ? address : undefined, note: note || undefined } });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      router.dismissTo('/activity');
      router.push(`/booking/${booking.id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      side="book"
      edges={[]}
      footer={
        short ? (
          <Button side="book" title={`Top up ${naira(total - (balance ?? 0))} to book`} onPress={() => router.navigate('/wallet')} />
        ) : (
          <Button
            side="book"
            title={!slot ? 'Choose a time' : reschedule ? `Move to ${slot.label}` : `${p.instantBooking ? 'Book' : 'Request'} · pay ${naira(total)}`}
            disabled={!slot || (where === 'home' && address.trim().length < 5)}
            loading={busy}
            onPress={submit}
          />
        )
      }
    >
      <Stack.Screen options={{ title: reschedule ? 'Change time' : 'Book' }} />
      <Txt side="book" size={20} weight="800">{s.name}</Txt>
      <Txt side="book" muted>{p.businessName} · {duration(s.durationMin)}</Txt>

      <Txt side="book" weight="700" style={{ marginTop: 20, marginBottom: 8 }}>Day</Txt>
      {dates.isLoading ? <Loading side="book" /> : null}
      {dates.data && !dates.data.dates.length ? <Txt side="book" muted>No days open for booking right now.</Txt> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {dates.data?.dates.map((d) => <Chip side="book" key={d} label={day(`${d}T12:00:00+01:00`)} active={date === d} onPress={() => { setDate(d); setSlot(undefined); }} />)}
      </ScrollView>

      <Txt side="book" weight="700" style={{ marginTop: 20, marginBottom: 8 }}>Time</Txt>
      {slots.isLoading ? <Loading side="book" /> : null}
      {slots.data && !slots.data.slots.length ? <Txt side="book" muted>Fully booked this day. Try another day.</Txt> : null}
      <Row style={{ flexWrap: 'wrap', rowGap: 8, marginBottom: 16 }}>
        {slots.data?.slots.map((x) => <Chip side="book" key={x.startsAt} label={x.label.replace(/^.*?,\s*/, '')} active={slot?.startsAt === x.startsAt} onPress={() => setSlot(x)} />)}
      </Row>

      {!reschedule && s.location === 'either' ? (
        <View>
          <Txt side="book" weight="700" style={{ marginTop: 20, marginBottom: 8 }}>Where</Txt>
          <Row>
            <Chip side="book" label="At their place" active={where === 'shop'} onPress={() => setWhere('shop')} />
            <Chip side="book" label={`Come to me${s.callOutFee ? ` (+${naira(s.callOutFee)})` : ''}`} active={where === 'home'} onPress={() => setWhere('home')} />
          </Row>
        </View>
      ) : null}
      {!reschedule && where === 'home' ? <Field side="book" label="Your address" {...checks.input('address', address, setAddress)} multiline style={{ minHeight: 60 }} /> : null}
      {!reschedule ? <Field side="book" label="Note for the business (optional)" {...checks.input('note', note, setNote)} multiline placeholder="Anything they should know" /> : null}

      {!reschedule ? (
        <Card side="book" style={{ marginTop: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}><Txt side="book" muted>Service</Txt><Txt side="book">{naira(s.price)}</Txt></Row>
          {fee ? <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><Txt side="book" muted>Call-out fee</Txt><Txt side="book">{naira(fee)}</Txt></Row> : null}
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}><Txt side="book" weight="800">Total</Txt><Txt side="book" weight="800">{naira(total)}</Txt></Row>
          {user ? <Txt side="book" size={13} muted style={{ marginTop: 6 }}>Wallet: {balance != null ? naira(balance) : '…'}</Txt> : null}
          <Txt side="book" size={12} muted style={{ marginTop: 6 }}>
            {p.instantBooking ? 'Confirmed straight away.' : 'Paid now and held until they accept. Full refund if they don’t.'} Free cancellation up to 24 hours before.
          </Txt>
        </Card>
      ) : null}
      {err ? <Txt side="book" color={c.danger} style={{ marginTop: 12 }}>{err}</Txt> : null}
    </Screen>
  );
}
