
// src/app/(app)/delivery-agent/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Order, DeliveryAgent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Package, Wallet, UserCircle, MapPin, Route as RouteIcon, DollarSign, ClipboardList, Bike, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget'; // Re-using for now, consider a dedicated AgentWalletWidget
import { OrderListItem } from '@/components/orders/OrderListItem';
import { BarcodeScannerDialog, type ScanPurpose } from '@/components/delivery/BarcodeScannerDialog';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

export default function DeliveryAgentDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  // Store all orders and derive subsections from it
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentScanOrderId, setCurrentScanOrderId] = useState<string | null>(null);
  const [currentScanPurpose, setCurrentScanPurpose] = useState<ScanPurpose | null>(null);

  const { toast } = useToast();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [agentRes, ordersRes] = await Promise.all([fetch('/api/delivery-agent/profile'), fetch('/api/orders')]);
      if (agentRes.ok) {
        const { agent } = await agentRes.json();
        setAgent(agent);
      }
      if (ordersRes.ok) {
        const { orders } = await ordersRes.json();
        setAllOrders(
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
    if (!authLoading && user && role === 'delivery_agent') {
      loadDashboard();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, role, loadDashboard]);

  const updateOrder = useCallback(async (orderId: string, status: Order['status'], extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    });
    return res.ok;
  }, []);

  const handleAcceptDelivery = async (orderId: string) => {
    if (!agent) return;
    const ok = await updateOrder(orderId, 'AcceptedByAgent', { deliveryAgentId: agent.id });
    if (ok) {
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'AcceptedByAgent', deliveryAgentId: agent.id } : o)));
      toast({
        title: 'Delivery Accepted!',
        description: `Order ${orderId} is now assigned to you.`,
      });
    }
  };

  const openScanner = (orderId: string, purpose: ScanPurpose) => {
    setCurrentScanOrderId(orderId);
    setCurrentScanPurpose(purpose);
    setIsScannerOpen(true);
  };

  const handleScanSuccess = async (orderId: string, purpose: ScanPurpose) => {
    const newStatus = purpose === 'pickup' ? 'PickedUpByAgent' : 'Delivered';
    const ok = await updateOrder(orderId, newStatus);
    if (ok) {
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (purpose === 'pickup') {
        toast({ title: 'Pickup Confirmed', description: `Order ${orderId} scanned at vendor.` });
      } else {
        toast({ title: 'Delivery Confirmed', description: `Order ${orderId} delivered to customer.` });
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading agent dashboard...</p>
      </div>
    );
  }

  if (!user || role !== 'delivery_agent') {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Sign in with a delivery agent account to view your dashboard.</p>
        <Button asChild>
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">You haven&apos;t set up your delivery agent profile yet.</p>
        <Button asChild>
          <Link href="/auth/register/delivery-agent">Complete Your Profile</Link>
        </Button>
      </div>
    );
  }

  const agentFullAddress = `${agent.streetAddress}, ${agent.city}, ${agent.country}`;

  const availableDeliveries = allOrders.filter(o => o.status === 'ReadyForPickup' && !o.deliveryAgentId);
  const myActiveDeliveries = allOrders.filter(o => o.deliveryAgentId === agent.id && o.status !== 'Delivered' && o.status !== 'Cancelled');
  const myCompletedDeliveries = allOrders.filter(o => o.deliveryAgentId === agent.id && (o.status === 'Delivered' || o.status === 'Cancelled'));


  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Bike className="h-8 w-8" />
        Delivery Agent Dashboard ({agent.name})
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserCircle className="h-6 w-6 text-primary" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Name:</strong> {agent.name}</p>
            <p><strong>Email:</strong> {agent.email}</p>
            <p><strong>Phone:</strong> {agent.phone}</p>
            <p><strong>Address:</strong> {agentFullAddress}</p>
            <p><strong>Vehicle:</strong> {agent.vehicleDetails || 'Not specified'}</p>
            <Button variant="outline" size="sm" className="mt-2">Edit Profile (Soon)</Button>
          </CardContent>
        </Card>

        <VendorWalletWidget />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Customer Reviews
          </CardTitle>
          <CardDescription>See feedback from customers on your deliveries.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Review display functionality is coming soon. Your ratings and comments will appear here.
          </p>
        </CardContent>
      </Card>


      {/* Active Deliveries Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <RouteIcon className="h-6 w-6 text-primary" />
            My Active Deliveries
          </CardTitle>
          <CardDescription>
            Manage your ongoing deliveries. Scan packages at pickup and delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myActiveDeliveries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">You have no active deliveries.</p>
          ) : (
            <div className="space-y-6">
              {myActiveDeliveries.map((order) => (
                <OrderListItem
                  key={order.id}
                  order={order}
                  userRole="delivery_agent"
                  onScanForPickup={() => openScanner(order.id, 'pickup')}
                  onScanForDelivery={() => openScanner(order.id, 'delivery')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Available Deliveries Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Package className="h-6 w-6 text-primary" />
            Available Deliveries
          </CardTitle>
          <CardDescription>
            Browse and accept deliveries available in your area. Only orders marked for agent pickup are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableDeliveries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No new deliveries available. Check back soon!</p>
          ) : (
            <div className="space-y-6">
              {availableDeliveries.map((order) => (
                 <OrderListItem
                  key={order.id}
                  order={order}
                  userRole="delivery_agent"
                  onAcceptDelivery={handleAcceptDelivery}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Deliveries Section */}
      {myCompletedDeliveries.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ClipboardList className="h-6 w-6 text-primary" />
                My Completed Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {myCompletedDeliveries.map((order) => (
                <OrderListItem key={order.id} order={order} userRole="delivery_agent" />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {currentScanOrderId && currentScanPurpose && (
        <BarcodeScannerDialog
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          orderId={currentScanOrderId}
          scanPurpose={currentScanPurpose}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
