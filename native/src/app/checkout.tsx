import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Divider, Field, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useCatalog, useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';

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

  return (
    <Screen
      side="shop"
      edges={[]}
      footer={
        short ? (
          <Button side="shop" title={`Top up ${naira(total - (balance ?? 0))} to pay`} onPress={() => router.navigate('/wallet')} />
        ) : (
          <Button side="shop" title={`Pay ${naira(total)} from wallet`} onPress={place} loading={busy} disabled={!cart.items.length || (mode === 'delivery' && address.trim().length < 5)} />
        )
      }
    >
      <Stack.Screen options={{ title: 'Checkout' }} />
      <Txt side="shop" weight="700" style={{ marginBottom: 8 }}>How do you want it?</Txt>
      <Row style={{ marginBottom: 14 }}>
        <Chip side="shop" label="Deliver to me" active={mode === 'delivery'} onPress={() => setMode('delivery')} />
        <Chip side="shop" label="I’ll pick it up" active={mode === 'pickup'} onPress={() => setMode('pickup')} />
      </Row>
      {mode === 'delivery' ? (
        <View>
          <Field side="shop" label="Delivery address" value={address} onChangeText={setAddress} placeholder="House number, street, area, city" multiline />
          {saved.data?.addresses.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -6, marginBottom: 12 }}>
              {saved.data.addresses.map((a) => <Chip side="shop" key={a} label={a.length > 32 ? `${a.slice(0, 32)}…` : a} active={address === a} onPress={() => setAddress(a)} />)}
            </ScrollView>
          ) : null}
        </View>
      ) : (
        vendorIds.map((vid) =>
          openBranches(vid).length ? (
            <View key={vid} style={{ marginBottom: 12 }}>
              <Txt side="shop" size={13} weight="600" style={{ marginBottom: 6 }}>Collect from {vendor(vid)?.businessName}</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip side="shop" label="Main shop" active={(branchFor[vid] ?? 'main') === 'main'} onPress={() => setBranchFor((s) => ({ ...s, [vid]: 'main' }))} />
                {openBranches(vid).map((b) => <Chip side="shop" key={b.id} label={b.name} active={branchFor[vid] === b.id} onPress={() => setBranchFor((s) => ({ ...s, [vid]: b.id }))} />)}
              </ScrollView>
            </View>
          ) : (
            <Txt key={vid} side="shop" size={14} style={{ marginBottom: 12 }}>
              Collect from {vendor(vid)?.businessName ?? 'the shop'}{vendor(vid) ? `, ${vendor(vid)!.streetAddress}, ${vendor(vid)!.city}` : ''}
            </Txt>
          ),
        )
      )}
      <Card side="shop">
        {cart.items.map((i) => (
          <Row key={`${i.productId}${i.color}${i.size}`} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <Txt side="shop" size={14} style={{ flex: 1 }} numberOfLines={1}>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</Txt>
            <Txt side="shop" size={14}>{naira(i.price * i.quantity)}</Txt>
          </Row>
        ))}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt side="shop" muted>Delivery{shops > 1 && mode === 'delivery' ? ` (${shops} shops)` : ''}</Txt>
          <Txt side="shop">{fee ? naira(fee) : 'Free'}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Txt side="shop" weight="800" size={17}>Total</Txt>
          <Txt side="shop" weight="800" size={17}>{naira(total)}</Txt>
        </Row>
        <Txt side="shop" size={13} muted style={{ marginTop: 8 }}>Wallet balance: {balance != null ? naira(balance) : '…'}</Txt>
      </Card>
      {mode === 'delivery' ? <Txt side="shop" size={12} muted style={{ marginTop: 10 }}>When the rider arrives you’ll get a delivery code. Give it only after checking your items.</Txt> : null}
      {error ? <Txt side="shop" color={c.danger} style={{ marginTop: 12 }}>{error}</Txt> : null}
    </Screen>
  );
}
