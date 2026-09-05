
// src/app/(app)/delivery-agent/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Order, DeliveryAgent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Wallet, UserCircle, MapPin, Route as RouteIcon, DollarSign, ClipboardList, Bike, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget'; // Re-using for now, consider a dedicated AgentWalletWidget
import { OrderListItem } from '@/components/orders/OrderListItem';
import { BarcodeScannerDialog, type ScanPurpose } from '@/components/delivery/BarcodeScannerDialog';
import { Separator } from '@/components/ui/separator';
import { masterSampleOrders, sampleDeliveryAgents } from '@/lib/mockData';

// Use a specific agent from mockData
const MOCK_CURRENT_AGENT_ID = 'agent001'; // Alex Rider
const currentAgent = sampleDeliveryAgents.find(a => a.id === MOCK_CURRENT_AGENT_ID) || sampleDeliveryAgents[0];


export default function DeliveryAgentDashboardPage() {
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  // Store all orders and derive subsections from it
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentScanOrderId, setCurrentScanOrderId] = useState<string | null>(null);
  const [currentScanPurpose, setCurrentScanPurpose] = useState<ScanPurpose | null>(null);

  const { toast } = useToast();

 useEffect(() => {
    setAgent(currentAgent);
    // Set the master list of orders. In a real app, this would be fetched.
    // For the demo, we'll sort them initially.
    // Ensure masterSampleOrders is properly loaded
    if (masterSampleOrders && masterSampleOrders.length > 0) {
        setAllOrders([...masterSampleOrders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
        setAllOrders([]); // Handle case where mockData might be empty or undefined
    }
    setIsLoading(false);
  }, []);


  const updateOrderStatus = useCallback((orderId: string, newStatus: Order['status'], agentIdForAssignment?: string) => {
    setAllOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, deliveryAgentId: agentIdForAssignment || order.deliveryAgentId }
          : order
      )
    );
  }, []);

  const handleAcceptDelivery = (orderId: string) => {
    const orderToAccept = allOrders.find(o => o.id === orderId && o.status === 'ReadyForPickup' && !o.deliveryAgentId);
    if (orderToAccept && agent) {
      updateOrderStatus(orderId, 'AcceptedByAgent', agent.id);
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

  const handleScanSuccess = (orderId: string, purpose: ScanPurpose) => {
    if (purpose === 'pickup') {
      updateOrderStatus(orderId, 'PickedUpByAgent');
      toast({ title: 'Pickup Confirmed', description: `Order ${orderId} scanned at vendor.` });
    } else if (purpose === 'delivery') {
      updateOrderStatus(orderId, 'Delivered');
      toast({ title: 'Delivery Confirmed', description: `Order ${orderId} delivered to customer.` });
    }
  };

  if (isLoading || !agent) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading agent dashboard...</p>
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
