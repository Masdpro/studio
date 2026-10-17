// src/app/(app)/vendor/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BranchesManager } from '@/components/vendor/BranchesManager';
import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Wallet as WalletIcon, ClipboardList, Star, Loader2, MapPin } from 'lucide-react';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import type { Order, Vendor } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function BranchOrdersPage() {
  const { user, role, roles, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [displayedVendorOrders, setDisplayedVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendorRes, ordersRes] = await Promise.all([fetch('/api/vendor/profile'), fetch('/api/orders?as=branch')]);
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
    if (!authLoading && user && roles.includes('branch')) {
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

  if (!user || !roles.includes('branch')) {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Sign in with a branch account to view your dashboard.</p>
        <Button asChild>
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <OrderTrackingView
            orders={displayedVendorOrders}
            title="Track Your Orders"
            description="Monitor the status of orders placed with your business."
            userRole="vendor"
            onAttendToOrder={handleAttendToOrder}
            onMarkAsReadyForPickup={handleMarkAsReadyForPickup}
          />
    </div>
  );
}
