
// src/app/(app)/delivery-agent/dashboard/page.tsx
'use client';
import { AccountVerification } from '@/components/account/AccountVerification';
import { useTradingStatus } from '@/hooks/use-trading-status';

import { useState, useEffect, useCallback } from 'react';
import type { Order, DeliveryAgent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Package, Wallet, UserCircle, MapPin, Route as RouteIcon, DollarSign, ClipboardList, Bike, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget'; // Re-using for now, consider a dedicated AgentWalletWidget
import { OrderListItem } from '@/components/orders/OrderListItem';
import { DeliveryCodeDialog } from '@/components/orders/DeliveryCode';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { InfoTip } from '@/components/ui/info-tip';

export default function DeliveryAgentDashboardPage() {
  const { user, role, roles, loading: authLoading } = useAuth();
  const { mayTrade, loaded: tradingLoaded } = useTradingStatus('delivery_agent');
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  // Store all orders and derive subsections from it
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const { toast } = useToast();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [agentRes, ordersRes] = await Promise.all([fetch('/api/delivery-agent/profile'), fetch('/api/orders?as=agent')]);
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
    if (!authLoading && user && roles.includes('delivery_agent')) {
      loadDashboard();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, role, loadDashboard]);

  const updateOrder = useCallback(async (orderId: string, status: Order['status'], extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra, actingAs: 'agent' }),
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

  const [codeOrderId, setCodeOrderId] = useState<string | null>(null);

  const handleScanSuccess = async (orderId: string, purpose: 'pickup' | 'delivery') => {
    const newStatus = purpose === 'pickup' ? 'PickedUpByAgent' : 'Delivered';
    const ok = await updateOrder(orderId, newStatus);
    if (ok) {
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (purpose === 'pickup') {
        toast({ title: 'Collected', description: 'The customer now has their delivery code. Ask for it when you hand over the order.' });
      } else {
        toast({ title: 'Delivery Confirmed', description: `Order ${orderId} delivered to customer.` });
      }
    }
  };

  // Share live location for any order this agent has picked up and is out delivering,
  // so the customer's tracker map has something to follow.
  const outForDeliveryIds = agent
    ? allOrders.filter((o) => o.deliveryAgentId === agent.id && o.status === 'PickedUpByAgent').map((o) => o.id)
    : [];
  const outForDeliveryKey = outForDeliveryIds.join(',');

  useEffect(() => {
    if (!outForDeliveryKey || !navigator.geolocation) return;
    const orderIds = outForDeliveryKey.split(',');

    const pingLocation = () => {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        for (const orderId of orderIds) {
          fetch(`/api/orders/${orderId}/location`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
          }).catch(() => {
            // A missed ping isn't worth surfacing to the agent — the next tick will retry.
          });
        }
      });
    };

    pingLocation();
    const interval = setInterval(pingLocation, 10000);
    return () => clearInterval(interval);
  }, [outForDeliveryKey]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading agent dashboard...</p>
      </div>
    );
  }

  if (!tradingLoaded) return <div className="container mx-auto py-8 text-center text-muted-foreground">Loading…</div>;
  if (!mayTrade) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 py-8">
        <h1 className="text-3xl font-bold text-primary">Delivery Agent Dashboard</h1>
        <AccountVerification focus="delivery_agent" />
      </div>
    );
  }

  if (!user || !roles.includes('delivery_agent')) {
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
    <div className="container mx-auto space-y-5 py-2 md:space-y-8 md:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Bike className="h-6 w-6 text-primary md:h-8 md:w-8" />
          Hi, {agent.name.split(' ')[0]}
        <InfoTip>Your deliveries and earnings.</InfoTip></h1>
        
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
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
          </CardContent>
        </Card>

        <VendorWalletWidget />
      </div>



      {/* Active Deliveries Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <RouteIcon className="h-6 w-6 text-primary" />
            My Active Deliveries
          <InfoTip>Manage your ongoing deliveries. Confirm when you've collected each order, and enter the customer's code to complete the delivery.</InfoTip></CardTitle>
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
                  onScanForPickup={() => handleScanSuccess(order.id, 'pickup')}
                  onScanForDelivery={() => setCodeOrderId(order.id)}
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
          <InfoTip>Browse and accept deliveries available in your area. Only orders marked for agent pickup are shown.</InfoTip></CardTitle>
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

      {codeOrderId && (
        <DeliveryCodeDialog
          orderId={codeOrderId}
          open={!!codeOrderId}
          onOpenChange={(o) => !o && setCodeOrderId(null)}
          onDelivered={() => {
            const id = codeOrderId;
            setAllOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'Delivered' } : o)));
            toast({ title: 'Delivery confirmed', description: 'Your delivery fee is now in your wallet.' });
            window.dispatchEvent(new Event('wallet:updated'));
          }}
        />
      )}
    </div>
  );
}
