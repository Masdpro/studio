
// src/app/(app)/vendor/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ListPlus, Settings, Truck as TrackIcon } from 'lucide-react'; // Renamed Truck to TrackIcon to avoid conflict
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import type { Order } from '@/lib/types';

// Placeholder vendor data, in a real app this would come from auth/DB
const sampleVendor = {
  id: 'v123', // Ensure this ID matches vendorId in sampleVendorOrders
  businessName: 'Awesome Eats',
  contactEmail: 'contact@awesomeeats.com',
  phone: '555-1234',
  address: '123 Food Lane, Culinary City',
};

// Mock data for vendor orders
const sampleVendorOrders: Order[] = [
  {
    id: 'orderToVendor001',
    customerId: 'cust123',
    vendorId: 'v123', // Matches sampleVendor.id
    items: [{ productId: 'p1', name: 'Gourmet Burger (from this vendor)', price: 15.99, quantity: 1 }],
    totalAmount: 15.99,
    status: 'ReadyForPickup',
    pickupAddress: sampleVendor.address,
    deliveryAddress: 'John Doe, 456 Customer Ave, Suburbia',
    deliveryFee: 6.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
  },
  {
    id: 'orderToVendor002',
    customerId: 'cust789',
    vendorId: 'v123', // Matches sampleVendor.id
    items: [{ productId: 'p2', name: 'Artisan Pizza (from this vendor)', price: 18.50, quantity: 2 }],
    totalAmount: 37.00,
    status: 'Processing',
    pickupAddress: sampleVendor.address,
    deliveryAddress: 'Jane Smith, 101 Shopper St, Metroville',
    deliveryFee: 8.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
  },
  {
    id: 'orderToVendor003',
    customerId: 'cust456',
    vendorId: 'v123', // Matches sampleVendor.id
    items: [{ productId: 'p1', name: 'Gourmet Burger (from this vendor)', price: 15.99, quantity: 1 }],
    totalAmount: 15.99,
    status: 'Delivered',
    pickupAddress: sampleVendor.address,
    deliveryAddress: 'Alice Wonderland, 777 Dream Lane, Fantasyland',
    deliveryFee: 5.50,
    createdAt: new Date(Date.now() - 3600 * 1000 * 72), // 3 days ago
    deliveryAgentId: 'da003',
  },
];


export default function VendorDashboardPage() {
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);

  useEffect(() => {
    // In a real app, fetch orders for this specific vendor
    setVendorOrders(sampleVendorOrders);
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <VendorWalletWidget />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Manage Your Profile
          </CardTitle>
          <CardDescription>Keep your business information up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <VendorProfileForm vendor={sampleVendor} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ListPlus className="h-6 w-6 text-primary" />
            Product Management
          </CardTitle>
          <CardDescription>Add, edit, or remove your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Manage all your product listings from one place.</p>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/vendor/dashboard/products">
              Go to Product Management
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Order Tracking Section for Vendor */}
      <OrderTrackingView
        orders={vendorOrders}
        title="Track Your Orders"
        description="Monitor the status of orders placed with your business."
        userRole="vendor"
      />
    </div>
  );
}
