
// src/app/(app)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';
import { Loader2 } from 'lucide-react';

// Mock data for customer orders
const generateSampleCustomerOrders = (): Order[] => [
  {
    id: 'custOrder001',
    customerId: 'currentUser', // Placeholder for actual current user ID
    vendorId: 'v1',
    items: [{ productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'pizza margherita' }],
    totalAmount: 12.99,
    status: 'Delivered',
    pickupAddress: 'Awesome Eats, 123 Food Lane, Culinary City, Foodland',
    deliveryAddress: 'My Home, 456 Customer Ave, Suburbia, USA',
    deliveryFee: 5.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 48), // 2 days ago
    deliveryAgentId: 'da001',
  },
  {
    id: 'custOrder002',
    customerId: 'currentUser',
    vendorId: 'v2',
    items: [
      { productId: '3', name: 'Ultimate Chicken Burger', price: 9.50, quantity: 2, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'burger chicken' },
      { productId: '7', name: 'Sparkling Cola', price: 2.50, quantity: 2, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'cola drink' },
    ],
    totalAmount: 24.00,
    status: 'Out for Delivery',
    pickupAddress: 'Burger Joint, 789 Grill Rd, Flavor Town, Foodland',
    deliveryAddress: 'My Office, 789 Business Park, Metroville, USA',
    deliveryFee: 7.50,
    createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    deliveryAgentId: 'da002',
  },
  {
    id: 'custOrder003',
    customerId: 'currentUser',
    vendorId: 'v3',
    items: [{ productId: '5', name: 'Classic Caesar Salad', price: 7.99, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'salad caesar' }],
    totalAmount: 7.99,
    status: 'Processing',
    pickupAddress: 'Healthy Greens, 101 Salad St, Fresh City, Foodland',
    deliveryAddress: 'My Apartment, Bld C, Unit 10, Suburbia, USA',
    deliveryFee: 3.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
  },
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch orders for the logged-in customer
    setOrders(generateSampleCustomerOrders());
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
