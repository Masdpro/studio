// src/app/(app)/delivery-agent/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Order, DeliveryAgent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Wallet, UserCircle, MapPin, Route as RouteIcon, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget'; // Re-using for now, can be specialized

// Mock data
const sampleAgent: DeliveryAgent = {
  id: 'da001',
  name: 'Alex Rider',
  email: 'alex.rider@example.com',
  phone: '555-0001',
  address: '77 Delivery Lane, Transporter City',
  vehicleDetails: 'Scooter - Red Vespa, Plate: RIDE01',
  profileManaged: true,
};

const sampleAvailableDeliveries: Order[] = [
  {
    id: 'order001',
    customerId: 'cust123',
    vendorId: 'v1',
    items: [{ productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 1 }],
    totalAmount: 12.99,
    status: 'ReadyForPickup',
    pickupAddress: 'Awesome Eats, 123 Food Lane, Culinary City',
    deliveryAddress: 'John Doe, 456 Customer Ave, Suburbia',
    deliveryFee: 5.00,
    estimatedDistance: '3 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
  },
  {
    id: 'order002',
    customerId: 'cust456',
    vendorId: 'v2',
    items: [{ productId: '3', name: 'Ultimate Chicken Burger', price: 9.50, quantity: 2 }],
    totalAmount: 19.00,
    status: 'ReadyForPickup',
    pickupAddress: 'Burger Joint, 789 Grill Rd, Flavor Town',
    deliveryAddress: 'Jane Smith, 101 Shopper St, Metroville',
    deliveryFee: 7.50,
    estimatedDistance: '8 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
  },
];

export default function DeliveryAgentDashboardPage() {
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // In a real app, fetch agent data and available deliveries
    setAgent(sampleAgent);
    setAvailableDeliveries(sampleAvailableDeliveries);
  }, []);

  const handleAcceptDelivery = (orderId: string) => {
    console.log(`Accepted delivery: ${orderId}`);
    // Mock logic: remove from available and show toast
    setAvailableDeliveries(prev => prev.filter(order => order.id !== orderId));
    toast({
      title: 'Delivery Accepted!',
      description: `Order ${orderId} is now assigned to you.`,
    });
    // In a real app: update order status, assign agentId to order, etc.
  };

  if (!agent) {
    return <p>Loading agent dashboard...</p>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary">Delivery Agent Dashboard</h1>

      {/* Agent Profile Section (Simplified) */}
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
          <p><strong>Vehicle:</strong> {agent.vehicleDetails || 'Not specified'}</p>
          <Button variant="outline" size="sm" className="mt-2">Edit Profile (Coming Soon)</Button>
        </CardContent>
      </Card>
      
      {/* Wallet Section - reusing VendorWalletWidget for mock behavior */}
      <VendorWalletWidget /> 

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
            <p className="text-muted-foreground text-center py-4">No deliveries available right now. Check back soon!</p>
          ) : (
            <div className="space-y-6">
              {availableDeliveries.map((order) => (
                <Card key={order.id} className="bg-card/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      Order ID: {order.id}
                      <span className="text-lg font-bold text-accent flex items-center">
                        <DollarSign className="h-5 w-5 mr-1"/> {order.deliveryFee.toFixed(2)}
                      </span>
                    </CardTitle>
                     <CardDescription>
                      {order.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold">Pickup:</p>
                        <p className="text-sm">{order.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold">Deliver To:</p>
                        <p className="text-sm">{order.deliveryAddress}</p>
                      </div>
                    </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RouteIcon className="h-4 w-4" />
                        <span>Distance: {order.estimatedDistance || 'N/A'}</span>
                    </div>
                    <Button 
                      className="w-full bg-primary hover:bg-primary/80 mt-2"
                      onClick={() => handleAcceptDelivery(order.id)}
                    >
                      Accept Delivery
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
