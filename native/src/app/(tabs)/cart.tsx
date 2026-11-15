import { router } from 'expo-router';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Button, Card, Empty, H1, Img, Row, Screen, Txt } from '@/components/ui';
import { useCart } from '@/lib/cart';
import { useCatalog } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { naira } from '@/lib/theme';

export default function Cart() {
  const cart = useCart();
  const { c } = useSide();
  const { user } = useSession();
  const { data } = useCatalog();
  const vendorName = (id?: string) => data?.vendors.find((v) => v.id === id)?.businessName ?? 'Shop';
  const groups = new Map<string, typeof cart.items>();
  for (const i of cart.items) groups.set(i.vendorId ?? '', [...(groups.get(i.vendorId ?? '') ?? []), i]);

  if (!cart.items.length) {
    return (
      <Screen>
        <H1>Cart</H1>
        <Empty icon={<ShoppingBag color={c.muted} size={42} />} title="Your cart is empty" body="Add products from shops near you." action={<Button title="Start shopping" onPress={() => router.navigate('/')} />} />
      </Screen>
    );
  }
  return (
    <Screen
      footer={
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt size={13} muted>Subtotal</Txt>
            <Txt size={20} weight="800">{naira(cart.subtotal)}</Txt>
          </View>
          <Button title="Checkout" style={{ minWidth: 160 }} onPress={() => router.push(user ? '/checkout' : '/sign-in')} />
        </Row>
      }
    >
      <H1>Cart</H1>
      <Txt muted style={{ marginBottom: 10 }}>{cart.count} item{cart.count === 1 ? '' : 's'}</Txt>
      {[...groups.entries()].map(([vid, items]) => (
        <View key={vid} style={{ marginTop: 10 }}>
          <Txt weight="700" style={{ marginBottom: 8 }}>{vendorName(vid)}</Txt>
          {items.map((i) => (
            <Card key={`${i.productId}${i.color}${i.size}`} style={{ marginBottom: 8 }}>
              <Row gap={12} style={{ alignItems: 'flex-start' }}>
                <Img uri={i.imageUrl} style={{ width: 64, height: 64 }} />
                <View style={{ flex: 1 }}>
                  <Txt weight="600" numberOfLines={2}>{i.name}</Txt>
                  {i.color || i.size ? <Txt size={12} muted>{[i.color, i.size].filter(Boolean).join(' · ')}</Txt> : null}
                  <Txt weight="700" style={{ marginTop: 2 }}>{naira(i.price * i.quantity)}</Txt>
                  <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
                    <Row gap={14}>
                      <Pressable accessibilityLabel="Fewer" hitSlop={8} onPress={() => (i.quantity > 1 ? cart.setQty(i, i.quantity - 1) : cart.remove(i))} style={{ backgroundColor: c.soft, borderRadius: 8, padding: 6 }}>
                        <Minus size={16} color={c.text} />
                      </Pressable>
                      <Txt weight="700">{i.quantity}</Txt>
                      <Pressable accessibilityLabel="More" hitSlop={8} disabled={i.maxQuantity != null && i.quantity >= i.maxQuantity} onPress={() => cart.setQty(i, i.quantity + 1)} style={{ backgroundColor: c.soft, borderRadius: 8, padding: 6, opacity: i.maxQuantity != null && i.quantity >= i.maxQuantity ? 0.4 : 1 }}>
                        <Plus size={16} color={c.text} />
                      </Pressable>
                    </Row>
                    <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={() => cart.remove(i)}>
                      <Trash2 size={18} color={c.muted} />
                    </Pressable>
                  </Row>
                </View>
              </Row>
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}
