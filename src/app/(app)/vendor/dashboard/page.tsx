// src/app/(app)/vendor/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Wallet as WalletIcon, ClipboardList, Star, Loader2 } from 'lucide-react';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import type { Order, Vendor } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function VendorDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [displayedVendorOrders, setDisplayedVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendorRes, ordersRes] = await Promise.all([fetch('/api/vendor/profile'), fetch('/api/orders')]);
      if (vendorRes.ok) {
        const { vendor } = await vendorRes.json();
        setVendor(vendor);
      }
      if (ordersRes.ok) {
        const { orders } = await ordersRes.json();
        setDisplayedVendorOrders(
          orders
            .map((o: Order) => ({ ...o, createdAt: new Date(o.createdAt) }))
            .sort((a: Order, b: Order) => b.createdAt.getTime() - a.createdAt.getTime())
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && role === 'vendor') {
      loadDashboard();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, role, loadDashboard]);

  const updateOrder = useCallback(
    async (orderId: string, status: Order['status']) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    },
    []
  );

  const handleAttendToOrder = useCallback(
    async (orderId: string) => {
      const ok = await updateOrder(orderId, 'Processing');
      if (ok) {
        setDisplayedVendorOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'Processing' } : o)));
        toast({ title: 'Order Status Updated', description: `Order ${orderId} is now being processed.` });
      }
    },
    [toast, updateOrder]
  );

  const handleMarkAsReadyForPickup = useCallback(
    async (orderId: string) => {
      const order = displayedVendorOrders.find((o) => o.id === orderId);
      if (!order) return;
      const newStatus: Order['status'] = order.deliveryPreference === 'delivery' ? 'ReadyForPickup' : 'ReadyForCustomerPickup';
      const ok = await updateOrder(orderId, newStatus);
      if (ok) {
        setDisplayedVendorOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        const newStatusDescription = newStatus === 'ReadyForPickup' ? 'ready for delivery pickup' : 'ready for customer pickup';
        toast({ title: 'Order Ready!', description: `Order ${orderId} marked as ${newStatusDescription}.` });
      }
    },
    [displayedVendorOrders, toast, updateOrder]
  );

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user || role !== 'vendor') {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Sign in with a vendor account to view your dashboard.</p>
        <Button asChild>
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary mb-6">
        {vendor?.businessName ?? 'Your'} Dashboard
      </h1>
      {!vendor && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You haven&apos;t set up your vendor profile yet. Fill in the Profile tab below to get started.
            </p>
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5" /> Wallet
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Orders
          </TabsTrigger>
           <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-5 w-5" /> Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Manage Your Profile
              </CardTitle>
              <CardDescription>
                Keep your business information up to date.
                {vendor && (
                  <>
                    {' '}Your status on Dailybuy for taking orders is: <span className="font-semibold">{vendor.status}</span>.
                    Your physical store hours are: <span className="font-semibold">{vendor.operatingHours || 'Not set'}</span>.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorProfileForm vendor={vendor ?? undefined} onSaved={loadDashboard} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <VendorWalletWidget />
        </TabsContent>

        <TabsContent value="orders">
          <OrderTrackingView
            orders={displayedVendorOrders}
            title="Track Your Orders"
            description="Monitor the status of orders placed with your business."
            userRole="vendor"
            onAttendToOrder={handleAttendToOrder}
            onMarkAsReadyForPickup={handleMarkAsReadyForPickup}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                Customer Reviews
              </CardTitle>
              <CardDescription>See what customers are saying about your service.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review display functionality is coming soon. You will be able to see your aggregated ratings and individual comments here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
       {vendor && (
         <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your External Storefront</CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.externalStoreUrl ? (
              <p>
                Customers can visit your external storefront at:{' '}
                <Link href={`/vendor/${vendor.id}/store`} className="text-primary underline hover:text-primary/80">
                  View Your Store Page on Dailybuy
                </Link>
              </p>
            ) : (
              <p>You have not set an external store URL in your profile. Add one to allow customers to visit your site via Dailybuy.</p>
            )}
          </CardContent>
        </Card>
       )}
    </div>
  );
}
