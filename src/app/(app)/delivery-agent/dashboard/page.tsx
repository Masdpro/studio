
// src/app/(app)/delivery-agent/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Order, DeliveryAgent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Wallet, UserCircle, MapPin, Route as RouteIcon, DollarSign, ClipboardList, Bike, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget'; // Re-using for now
import { OrderListItem } from '@/components/orders/OrderListItem';
import { BarcodeScannerDialog } from '@/components/delivery/BarcodeScannerDialog';
import { Separator } from '@/components/ui/separator';

// Mock data
const sampleAgent: DeliveryAgent = {
  id: 'da001',
  name: 'Alex Rider',
  email: 'alex.rider@example.com',
  phone: '555-0001',
  streetAddress: '77 Delivery Lane',
  city: 'Transporter City',
  country: 'Agentland',
  vehicleDetails: 'Scooter - Red Vespa, Plate: RIDE01',
  profileManaged: true,
};

const generateInitialAvailableDeliveries = (): Order[] => [
  {
    id: 'order001',
    customerId: 'cust123',
    vendorId: 'v1',
    items: [{ productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'pizza margherita' }],
    totalAmount: 12.99,
    status: 'ReadyForPickup',
    pickupAddress: 'Awesome Eats, 123 Food Lane, Culinary City, Foodland',
    deliveryAddress: 'John Doe, 456 Customer Ave, Suburbia, USA',
    deliveryFee: 5.00,
    estimatedDistance: '3 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), 
  },
  {
    id: 'order002',
    customerId: 'cust456',
    vendorId: 'v2',
    items: [{ productId: '3', name: 'Ultimate Chicken Burger', price: 9.50, quantity: 2, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'burger chicken' }],
    totalAmount: 19.00,
    status: 'ReadyForPickup',
    pickupAddress: 'Burger Joint, 789 Grill Rd, Flavor Town, Foodland',
    deliveryAddress: 'Jane Smith, 101 Shopper St, Metroville, USA',
    deliveryFee: 7.50,
    estimatedDistance: '8 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2), 
  },
];

export default function DeliveryAgentDashboardPage() {
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<Order[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentScanOrderId, setCurrentScanOrderId] = useState<string | null>(null);
  const [currentScanPurpose, setCurrentScanPurpose] = useState<'pickup' | 'delivery' | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setAgent(sampleAgent);
    setAvailableDeliveries(generateInitialAvailableDeliveries());
    setIsLoading(false);
  }, []);

  const handleAcceptDelivery = (orderId: string) => {
    const orderToAccept = availableDeliveries.find(o => o.id === orderId);
    if (orderToAccept) {
      const acceptedOrder: Order = { ...orderToAccept, status: 'AcceptedByAgent', deliveryAgentId: agent?.id };
      setActiveDeliveries(prev => [acceptedOrder, ...prev]);
      setAvailableDeliveries(prev => prev.filter(order => order.id !== orderId));
      toast({
        title: 'Delivery Accepted!',
        description: `Order ${orderId} is now assigned to you.`,
      });
    }
  };

  const openScanner = (orderId: string, purpose: 'pickup' | 'delivery') => {
    setCurrentScanOrderId(orderId);
    setCurrentScanPurpose(purpose);
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (orderId: string, purpose: 'pickup' | 'delivery') => {
    setActiveDeliveries(prev => 
      prev.map(order => {
        if (order.id === orderId) {
          if (purpose === 'pickup') {
            toast({ title: 'Pickup Confirmed', description: `Order ${orderId} scanned at vendor.` });
            return { ...order, status: 'PickedUpByAgent' }; 
          } else if (purpose === 'delivery') {
            toast({ title: 'Delivery Confirmed', description: `Order ${orderId} delivered to customer.` });
            return { ...order, status: 'Delivered' };
          }
        }
        return order;
      })
    );
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

  const deliveriesToDisplay = activeDeliveries.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const completedDeliveries = activeDeliveries.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Bike className="h-8 w-8" />
        Delivery Agent Dashboard
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
          {deliveriesToDisplay.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">You have no active deliveries.</p>
          ) : (
            <div className="space-y-6">
              {deliveriesToDisplay.map((order) => (
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
            Browse and accept deliveries available in your area.
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
      
      {/* Completed Deliveries Section (Optional) */}
      {completedDeliveries.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ClipboardList className="h-6 w-6 text-primary" />
                Completed Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {completedDeliveries.map((order) => (
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
