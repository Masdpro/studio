
// src/app/(app)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import { Loader2 } from 'lucide-react';
import { masterSampleOrders } from '@/lib/mockData';

// Simulate a logged-in customer
const MOCK_CURRENT_CUSTOMER_ID = 'cust001'; // John Doe

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch orders for the logged-in customer
    const customerOrders = masterSampleOrders.filter(
      (order) => order.customerId === MOCK_CURRENT_CUSTOMER_ID
    ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    setOrders(customerOrders);
    setIsLoading(false);
  }, []);

  if (isLoading) {
     return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your orders...</p>
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
      />
    </div>
  );
}

    