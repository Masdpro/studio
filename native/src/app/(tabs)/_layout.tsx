import { Tabs } from 'expo-router/js-tabs';
import { CalendarCheck, House, Receipt, ShoppingCart, User, Wallet } from 'lucide-react-native';
import { useCart } from '@/lib/cart';
import { useSide } from '@/lib/side';

export default function TabsLayout() {
  const { side, c } = useSide();
  const { count } = useCart();
  const shop = side === 'shop';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: shop ? c.primary : c.text,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: shop ? 'Shop' : 'Book', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen
        name="activity"
        options={{ title: shop ? 'Orders' : 'Bookings', tabBarIcon: ({ color, size }) => (shop ? <Receipt color={color} size={size} /> : <CalendarCheck color={color} size={size} />) }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          href: shop ? undefined : null,
          tabBarBadge: count ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: c.primary, color: c.onPrimary },
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
