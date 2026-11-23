import { router, Stack } from 'expo-router';
import { ChevronRight, ClipboardList, Package, Store, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { QuickTour, TourButton, useQuickTour } from '@/components/QuickTour';
import { ApprovalBanner, Stat } from '@/components/Stat';
import { Card, ListItem, Row, Screen } from '@/components/ui';
import { useRoleApproval } from '@/lib/business';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { naira } from '@/lib/theme';
import type { Order } from '@/lib/types';

export default function VendorHome() {
  const c = useColors('shop');
  const tour = useQuickTour('vendor');
  const approval = useRoleApproval('vendor');
  const stats = useGet<{ total: { orders: number; revenue: number; completed: number; cancelled: number } }>(['vendor-analytics'], '/api/vendor/analytics');
  const orders = useGet<{ orders: Order[] }>(['vendor-orders', 'vendor'], '/api/orders?as=vendor', { refetchInterval: 30000 });
  const products = useGet<{ products: { stock?: number; paused?: boolean; lowStockAt?: number }[] }>(['vendor-products'], '/api/vendor/products');
  const waiting = orders.data?.orders.filter((o) => o.status === 'Pending').length ?? 0;
  const preparing = orders.data?.orders.filter((o) => o.status === 'Processing').length ?? 0;
  const low = products.data?.products.filter((p) => p.stock != null && p.stock <= (p.lowStockAt ?? 5)).length ?? 0;
  const chev = <ChevronRight color={c.muted} size={18} />;
  return (
    <Screen side="shop" edges={[]} refreshing={orders.isRefetching} onRefresh={() => { orders.refetch(); stats.refetch(); products.refetch(); }}>
      <Stack.Screen options={{ title: 'My store', headerRight: () => <TourButton kind="vendor" /> }} />
      <QuickTour kind="vendor" visible={tour.open} onClose={tour.close} />
      <ApprovalBanner side="shop" status={approval?.approvalStatus} note={approval?.approvalNote} onPress={() => router.push('/verification')} />
      <Row style={{ flexWrap: 'wrap', marginTop: 12 }} gap={10}>
        <Stat side="shop" label="New orders" value={waiting} tone={waiting ? 'warn' : undefined} />
        <Stat side="shop" label="Preparing" value={preparing} />
        <Stat side="shop" label="Sales" value={naira(stats.data?.total.revenue ?? 0)} />
        <Stat side="shop" label="Low on stock" value={low} tone={low ? 'warn' : undefined} />
      </Row>
      <Card side="shop" style={{ marginTop: 16 }}>
        <ListItem icon={<ClipboardList color={c.text} size={20} />} title="Orders" detail={waiting ? `${waiting} waiting for you` : 'Accept, prepare and hand over'} onPress={() => router.push('/vendor/orders')} right={chev} />
        <ListItem icon={<Package color={c.text} size={20} />} title="Products" detail={`${products.data?.products.length ?? '…'} products`} onPress={() => router.push('/vendor/products')} right={chev} />
        <ListItem icon={<Store color={c.text} size={20} />} title="Store details" detail="Name, photo, address and hours" onPress={() => router.push('/vendor/profile')} right={chev} />
        <ListItem icon={<Wallet color={c.text} size={20} />} title="Earnings and withdrawals" onPress={() => router.push('/withdraw')} right={chev} />
      </Card>
      <View style={{ height: 10 }} />
    </Screen>
  );
}
