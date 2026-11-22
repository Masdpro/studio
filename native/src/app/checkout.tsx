import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { MapPin, ShieldCheck, Store, Truck, Wallet as WalletIcon } from 'lucide-react-native';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Chip, Img, Row, Screen, Segmented, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useCatalog, useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { font, naira } from '@/lib/theme';

const DELIVERY_FEE = 1500; // per shop, same as the server

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

  const vendorIds = useMemo(() => [...new Set(cart.items.map((i) => i.vendorId ?? ''))], [cart.items]);
  const shops = vendorIds.length;
  const fee = mode === 'delivery' ? DELIVERY_FEE * shops : 0;
  const total = cart.subtotal + fee;
  const balance = wallet.data?.wallet.balance;
  const short = balance != null && balance < total;
  const vendor = (id: string) => data?.vendors.find((v) => v.id === id);
  const openBranches = (id: string) => (data?.branches ?? []).filter((b) => b.vendorId === id && b.status !== 'Closed' && b.status !== 'Temporarily Unavailable');
  const addr = mode === 'delivery' ? address.trim() : 'Pickup from shop';

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
      setError(e.message);
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
            <Txt side="shop" size={13} muted>{mode === 'delivery' ? `Delivery${shops > 1 ? ` (${shops} shops)` : ''}` : 'Pickup'}</Txt>
            <Txt side="shop" size={13} muted>{fee ? naira(fee) : 'Free'}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Txt side="shop" size={17} weight="800">Total</Txt>
            <Txt side="shop" size={17} weight="800">{naira(total)}</Txt>
          </Row>
          {short ? (
            <Button side="shop" kind="primary" title={`Top up ${naira(total - (balance ?? 0))} to pay`} onPress={() => router.navigate('/wallet')} />
          ) : (
            <Button side="shop" title={`Place order · ${naira(total)}`} icon={<ShieldCheck size={18} color={c.onPrimary} />} onPress={place} loading={busy} disabled={!cart.items.length || (mode === 'delivery' && address.trim().length < 5)} />
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: c.card, borderWidth: 2, borderColor: c.primary }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <WalletIcon size={18} color={c.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt side="shop" size={14} weight="700">Closebuy wallet</Txt>
          <Txt side="shop" size={12} muted>Balance {balance != null ? naira(balance) : '…'}</Txt>
        </View>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: c.primary }} />
      </View>
      {short ? <Txt side="shop" size={12} color={c.danger} style={{ marginTop: 8 }}>Your wallet is {naira(total - (balance ?? 0))} short. Top up by card or bank transfer, then come back.</Txt> : null}

      {mode === 'delivery' ? <Txt side="shop" size={12} muted style={{ marginTop: 14 }}>When the rider arrives you’ll get a delivery code. Give it only after checking your items.</Txt> : null}
      {error ? <Txt side="shop" color={c.danger} style={{ marginTop: 12 }}>{error}</Txt> : null}
    </Screen>
  );
}
