
// src/app/(app)/vendor/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Wallet as WalletIcon, ClipboardList, Star, Loader2 } from 'lucide-react';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import type { Order, Vendor } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { masterSampleOrders, sampleVendors } from '@/lib/mockData';

// Use a specific vendor from mockData
const MOCK_CURRENT_VENDOR_ID = 'vendor001'; // Good Eats Pizzeria
const currentVendor = sampleVendors.find(v => v.id === MOCK_CURRENT_VENDOR_ID) || sampleVendors[0];


export default function VendorDashboardPage() {
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch orders for this specific vendor
    const ordersForVendor = masterSampleOrders.filter(
      (order) => order.vendorId === currentVendor.id
    ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    setVendorOrders(ordersForVendor);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary mb-6">{currentVendor.businessName} Dashboard</h1>
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
                Keep your business information up to date. Your current status on Dailybuy is <span className="font-semibold">{currentVendor.status}</span>.
                Your physical store hours are: <span className="font-semibold">{currentVendor.operatingHours || 'Not set'}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorProfileForm vendor={currentVendor} />
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
          {currentVendor.externalStoreUrl ? (
            <p>
              Customers can visit your external storefront at:{' '}
              <Link href={`/vendor/${currentVendor.id}/store`} className="text-primary underline hover:text-primary/80">
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

    