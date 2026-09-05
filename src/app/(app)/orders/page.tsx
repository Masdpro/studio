'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Order } from '@/lib/types';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScannerDialog, type ScanPurpose } from '@/components/delivery/BarcodeScannerDialog';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // State for scanner dialog
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentScanOrderId, setCurrentScanOrderId] = useState<string | null>(null);
  const [currentScanPurpose, setCurrentScanPurpose] = useState<ScanPurpose | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const { orders } = await res.json();
        setOrders(
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
    if (!authLoading && user) {
      fetchOrders();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user, fetchOrders]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'Cancelled' } : o)));
        toast({
          title: 'Order Cancelled',
          description: `Order ${orderId} has been cancelled.`,
        });
      } else {
        toast({ title: 'Could not cancel order', variant: 'destructive' });
      }
    },
    [toast]
  );

  const openCustomerScanner = (orderId: string) => {
    setCurrentScanOrderId(orderId);
    setCurrentScanPurpose('customer_pickup');
    setIsScannerOpen(true);
  };

  const handleCustomerScanSuccess = async (orderId: string, purpose: ScanPurpose) => {
    if (purpose === 'customer_pickup') {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PickedUpByCustomer' }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'PickedUpByCustomer' } : o)));
        toast({
          title: 'Pickup Confirmed!',
          description: `You have successfully confirmed pickup for order ${orderId}.`,
        });
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Sign in to see your orders.</p>
        <Button asChild>
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <OrderTrackingView
        orders={orders}
        title="My Orders"
        description="Track the status of your current and past orders."
        userRole="customer"
        onCancelOrder={handleCancelOrder}
        onScanForCustomerPickup={openCustomerScanner}
      />
      {currentScanOrderId && currentScanPurpose && (
        <BarcodeScannerDialog
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          orderId={currentScanOrderId}
          scanPurpose={currentScanPurpose}
          onScanSuccess={handleCustomerScanSuccess}
        />
      )}
    </div>
  );
}
