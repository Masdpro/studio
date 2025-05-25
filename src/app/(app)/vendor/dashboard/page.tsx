
// src/app/(app)/vendor/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Wallet as WalletIcon, ClipboardList, Star } from 'lucide-react';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import type { Order, Vendor } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Placeholder vendor data, in a real app this would come from auth/DB
const sampleVendor: Vendor = {
  id: 'v123', // Ensure this ID matches vendorId in sampleVendorOrders
  businessName: 'Awesome Eats',
  contactEmail: 'contact@awesomeeats.com',
  phone: '555-1234',
  streetAddress: '123 Food Lane',
  city: 'Culinary City',
  country: 'Foodland',
  externalStoreUrl: 'https://example.com/awesomeeats',
  operatingHours: '10 AM - 10 PM, Daily',
  status: 'Open',
};

const fullVendorAddress = `${sampleVendor.streetAddress}, ${sampleVendor.city}, ${sampleVendor.country}`;

// Mock data for vendor orders
const sampleVendorOrders: Order[] = [
  {
    id: 'orderToVendor001',
    customerId: 'cust123',
    vendorId: 'v123', // Matches sampleVendor.id
    items: [{ productId: 'p1', name: 'Gourmet Burger (from this vendor)', price: 15.99, quantity: 1 }],
    totalAmount: 15.99,
    status: 'ReadyForPickup',
    pickupAddress: fullVendorAddress,
    deliveryAddress: 'John Doe, 456 Customer Ave, Suburbia, USA',
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
    pickupAddress: fullVendorAddress,
    deliveryAddress: 'Jane Smith, 101 Shopper St, Metroville, USA',
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
    pickupAddress: fullVendorAddress,
    deliveryAddress: 'Alice Wonderland, 777 Dream Lane, Fantasyland, USA',
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
      <h1 className="text-3xl font-bold text-primary mb-6">Vendor Dashboard</h1>
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
                Keep your business information up to date. Your current status on Dailybuy is <span className="font-semibold">{sampleVendor.status}</span>.
                Your physical store hours are: <span className="font-semibold">{sampleVendor.operatingHours || 'Not set'}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorProfileForm vendor={sampleVendor} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <VendorWalletWidget />
        </TabsContent>

        <TabsContent value="orders">
          <OrderTrackingView
            orders={vendorOrders}
            title="Track Your Orders"
            description="Monitor the status of orders placed with your business."
            userRole="vendor"
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
       <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your External Storefront</CardTitle>
        </CardHeader>
        <CardContent>
          {sampleVendor.externalStoreUrl ? (
            <p>
              Customers can visit your external storefront at:{' '}
              <Link href={`/vendor/${sampleVendor.id}/store`} className="text-primary underline hover:text-primary/80">
                View Your Store Page on Dailybuy
              </Link>
            </p>
          ) : (
            <p>You have not set an external store URL in your profile. Add one to allow customers to visit your site via Dailybuy.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
