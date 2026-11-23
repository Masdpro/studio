import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { CreditCard, MapPin, ShieldCheck, Store, Truck, Wallet as WalletIcon } from 'lucide-react-native';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Chip, Img, Row, Screen, Segmented, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { PaystackSheet, confirmPayment, type SheetResult } from '@/components/PaystackSheet';
import { useCart } from '@/lib/cart';
import { useCatalog, useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { font, naira } from '@/lib/theme';

/** Delivery is priced by distance from each shop to the address, between these (same as the server). */
const FEE_MIN = 1000;
/** For now delivery is a flat ₦1,000 per shop (same switch as the server's DISTANCE_PRICING). */
const DISTANCE_PRICING = false;
const FLAT_FEE = 1000;
const FEE_MAX = 2500;

export default function Checkout() {
  const cart = useCart();
  const c = useColors('shop');
  const qc = useQueryClient();
  const { data } = useCatalog();
  const wallet = useGet<{ wallet: { balance: number } }>(['wallet'], '/api/wallet');
  const saved = useGet<{ addresses: string[] }>(['addresses'], '/api/account/addresses');
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [branchFor, setBranchFor] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // How to pay: the wallet balance, or online with Paystack inside the app (card, transfer, USSD...).
  const [method, setMethod] = useState<'wallet' | 'online'>('wallet');
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [payRef, setPayRef] = useState<string | null>(null);

  const vendorIds = useMemo(() => [...new Set(cart.items.map((i) => i.vendorId ?? ''))], [cart.items]);
  const shops = vendorIds.length;
  // Ask the server what delivery costs to this address (it charges exactly this amount on the order).
  const quoteKey = DISTANCE_PRICING && mode === 'delivery' && address.trim().length >= 5 ? JSON.stringify([address.trim().toLowerCase(), vendorIds, branchFor]) : '';
  const [quote, setQuote] = useState<{ key: string; fee: number; km: number | null; located: boolean } | null>(null);
  useEffect(() => {
    if (!quoteKey) return;
    let off = false;
    const t = setTimeout(() => {
      api<{ located: boolean; quotes: { fee: number; km: number | null }[] }>('/api/delivery-quote', {
        body: { address: address.trim(), shops: vendorIds.map((vendorId) => ({ vendorId, branchId: branchFor[vendorId] ?? 'main' })) },
      })
        .then((d) => {
          if (off) return;
          const kms = d.quotes.map((q) => q.km).filter((k): k is number => k != null);
          setQuote({ key: quoteKey, fee: d.quotes.reduce((n, q) => n + q.fee, 0), km: kms.length ? Math.max(...kms) : null, located: d.located });
        })
        .catch(() => {});
    }, 600);
    return () => { off = true; clearTimeout(t); };
  }, [quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const feeReady = mode !== 'delivery' || !DISTANCE_PRICING || (!!quote && quote.key === quoteKey);
  const fee = mode !== 'delivery' ? 0 : !DISTANCE_PRICING ? FLAT_FEE * shops : feeReady && quote ? quote.fee : 0;
  const total = cart.subtotal + fee;
  const balance = wallet.data?.wallet.balance;
  const short = method === 'wallet' && balance != null && balance < total;
  const vendor = (id: string) => data?.vendors.find((v) => v.id === id);
  const openBranches = (id: string) => (data?.branches ?? []).filter((b) => b.vendorId === id && b.status !== 'Closed' && b.status !== 'Temporarily Unavailable');
  const addr = mode === 'delivery' ? address.trim() : 'Pickup from shop';

  /** Pay online: start a Paystack payment for the total and open it in the in-app sheet. */
  const payOnline = async () => {
    setError(null);
    if (total > 1_000_000) { setError('Online payments go up to ₦1,000,000. Please pay from your wallet.'); return; }
    setBusy(true);
    try {
      const { authorizationUrl, reference } = await api<{ authorizationUrl: string; reference: string }>('/api/payments/wallet/initialize', { body: { amount: total, purpose: 'order' } });
      setPayRef(reference);
      setPayUrl(authorizationUrl);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  /** The payment sheet closed: confirm the payment (it lands in the wallet), then place the order from it. */
  const onPaid = async (r: SheetResult) => {
    setPayUrl(null);
    const ref = r.status === 'done' && r.reference ? r.reference : payRef;
    setPayRef(null);
    if (!ref) { setBusy(false); return; }
    const res = await confirmPayment((x) => api(`/api/payments/wallet/verify?reference=${encodeURIComponent(x)}`), ref, r.status === 'done' ? 10 : 1);
    qc.invalidateQueries({ queryKey: ['wallet'] });
    if (res.success) return place();
    setBusy(false);
    setError(
      r.status === 'cancelled' ? 'Payment cancelled. You have not been charged.'
        : res.pending ? 'Your bank has not confirmed the payment yet. If you paid, the money will appear in your wallet shortly and you can pay from there.'
          : res.error ?? 'The payment was not completed.',
    );
  };

  const place = async () => {
    setError(null);
    setBusy(true);
    try {
      const branchSelections = Object.fromEntries(vendorIds.map((v) => [v, branchFor[v] ?? 'main']));
      const { orderIds } = await api<{ orderIds: string[] }>('/api/orders', { body: { items: cart.items, deliveryPreference: mode, deliveryAddress: addr, branchSelections } });
      cart.clear();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      router.dismissTo('/activity');
      if (orderIds.length === 1) router.push(`/order/${orderIds[0]}`);
    } catch (e: any) {
      // After paying online the money is already in the wallet, so say where it is.
      setError(method === 'online' ? `${e.message} Your payment is safe in your Closebuy wallet.` : e.message);
    } finally {
      setBusy(false);
    }
  };

  const placeFrom = (vid: string) => {
    const v = vendor(vid);
    return v ? `${v.businessName}, ${v.streetAddress}, ${v.city}` : 'The shop';
  };

  return (
    <Screen
      side="shop"
      edges={[]}
      footer={
        <View style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt side="shop" size={13} muted>Subtotal</Txt>
            <Txt side="shop" size={13} muted>{naira(cart.subtotal)}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt side="shop" size={13} muted>{mode === 'delivery' ? `Delivery${shops > 1 ? ` (${shops} shops)` : ''}${feeReady && quote?.km != null ? ` · ${quote.km} km` : ''}` : 'Pickup'}</Txt>
            <Txt side="shop" size={13} muted>{mode !== 'delivery' ? 'Free' : !DISTANCE_PRICING ? naira(fee) : !quoteKey ? `${naira(FEE_MIN)}–${naira(FEE_MAX)}` : feeReady ? naira(fee) : 'Working out…'}</Txt>
          </Row>
          {mode === 'delivery' && feeReady && quote && !quote.located ? (
            <Txt side="shop" size={11} muted style={{ marginBottom: 4 }}>We couldn’t find that address on the map, so delivery is the {naira(FEE_MAX)} maximum. Add the area or a landmark for an exact price.</Txt>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Txt side="shop" size={17} weight="800">Total</Txt>
            <Txt side="shop" size={17} weight="800">{naira(total)}</Txt>
          </Row>
          {short ? (
            <Button side="shop" kind="primary" title={`Top up ${naira(total - (balance ?? 0))} to pay`} onPress={() => router.navigate('/wallet')} />
          ) : (
            <Button
              side="shop"
              title={method === 'online' ? `Pay ${naira(total)} online` : `Place order · ${naira(total)}`}
              icon={method === 'online' ? <CreditCard size={18} color={c.onPrimary} /> : <ShieldCheck size={18} color={c.onPrimary} />}
              onPress={method === 'online' ? payOnline : place}
              loading={busy}
              disabled={!cart.items.length || (mode === 'delivery' && (address.trim().length < 5 || !feeReady))}
            />
          )}
        </View>
      }
    >
      <Stack.Screen options={{ title: 'Checkout' }} />
      <Segmented
        side="shop"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'delivery', label: 'Delivery', icon: (col) => <Truck size={16} color={col} /> },
          { value: 'pickup', label: 'Pickup', icon: (col) => <Store size={16} color={col} /> },
        ]}
      />

      <Txt side="shop" size={13} weight="800" style={{ marginTop: 20, marginBottom: 8 }}>{mode === 'delivery' ? 'Deliver to' : 'Collect from'}</Txt>
      {mode === 'delivery' ? (
        <View>
          <Card side="shop" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <MapPin size={18} color={c.text} />
            </View>
            <TextInput
              accessibilityLabel="Delivery address"
              value={address}
              onChangeText={setAddress}
              placeholder="House number, street, area, city"
              placeholderTextColor={c.muted}
              multiline
              style={{ flex: 1, minHeight: 44, fontSize: 15, ...font('600'), color: c.text, paddingTop: 10, textAlignVertical: 'top' }}
            />
          </Card>
          {saved.data?.addresses.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {saved.data.addresses.map((a) => <Chip side="shop" key={a} label={a.length > 32 ? `${a.slice(0, 32)}…` : a} active={address === a} onPress={() => setAddress(a)} />)}
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {vendorIds.map((vid) => (
            <Card key={vid} side="shop" style={{ gap: 10 }}>
              <Row gap={12}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={18} color={c.text} />
                </View>
                <Txt side="shop" size={14} weight="700" style={{ flex: 1 }}>{placeFrom(vid)}</Txt>
              </Row>
              {openBranches(vid).length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Chip side="shop" label="Main shop" active={(branchFor[vid] ?? 'main') === 'main'} onPress={() => setBranchFor((s) => ({ ...s, [vid]: 'main' }))} />
                  {openBranches(vid).map((b) => <Chip side="shop" key={b.id} label={b.name} active={branchFor[vid] === b.id} onPress={() => setBranchFor((s) => ({ ...s, [vid]: b.id }))} />)}
                </ScrollView>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <Txt side="shop" size={13} weight="800" style={{ marginTop: 20, marginBottom: 8 }}>Your order · {cart.count} {cart.count === 1 ? 'item' : 'items'}</Txt>
      <Card side="shop" style={{ gap: 12 }}>
        {cart.items.map((i, n) => (
          <View key={`${i.productId}${i.color}${i.size}`} style={{ gap: 12 }}>
            {n ? <View style={{ height: 1, backgroundColor: c.soft }} /> : null}
            <Row gap={12}>
              <Img uri={i.imageUrl} style={{ width: 52, height: 52 }} radius={14} />
              <View style={{ flex: 1 }}>
                <Txt side="shop" size={14} weight="700" numberOfLines={1}>{i.name}</Txt>
                <Txt side="shop" size={12} muted numberOfLines={1}>{[vendor(i.vendorId ?? '')?.businessName, i.color, i.size, `×${i.quantity}`].filter(Boolean).join(' · ')}</Txt>
              </View>
              <Txt side="shop" size={14} weight="800">{naira(i.price * i.quantity)}</Txt>
            </Row>
          </View>
        ))}
      </Card>

      <Txt side="shop" size={13} weight="800" style={{ marginTop: 20, marginBottom: 8 }}>Pay with</Txt>
      {([
        { id: 'wallet', icon: WalletIcon, title: 'Closebuy wallet', note: `Balance ${balance != null ? naira(balance) : '…'}` },
        { id: 'online', icon: CreditCard, title: 'Pay online', note: 'Card, bank transfer, USSD' },
      ] as const).map((m) => {
        const on = method === m.id;
        const Icon = m.icon;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => { setMethod(m.id); setError(null); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: c.card, borderWidth: 2, borderColor: on ? c.primary : c.border, marginBottom: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? c.primary : c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={on ? c.onPrimary : c.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt side="shop" size={14} weight="700">{m.title}</Txt>
              <Txt side="shop" size={12} muted>{m.note}</Txt>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? c.primary : c.border }} />
          </Pressable>
        );
      })}
      {short ? (
        <Row gap={6} style={{ marginTop: 2, flexWrap: 'wrap' }}>
          <Txt side="shop" size={12} color={c.danger}>Your wallet is {naira(total - (balance ?? 0))} short.</Txt>
          <Pressable accessibilityRole="button" onPress={() => setMethod('online')} hitSlop={8}>
            <Txt side="shop" size={12} weight="700" color={c.primary}>Pay online instead</Txt>
          </Pressable>
        </Row>
      ) : null}
      <PaystackSheet url={payUrl} onClose={onPaid} />

      {mode === 'delivery' ? <Txt side="shop" size={12} muted style={{ marginTop: 14 }}>When the rider arrives you’ll get a delivery code. Give it only after checking your items.</Txt> : null}
      {error ? <Txt side="shop" color={c.danger} style={{ marginTop: 12 }}>{error}</Txt> : null}
    </Screen>
  );
}
