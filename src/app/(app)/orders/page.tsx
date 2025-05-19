
// src/app/(app)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { OrderTrackingView } from '@/components/orders/OrderTrackingView';

// Mock data for customer orders
const sampleCustomerOrders: Order[] = [
  {
    id: 'custOrder001',
    customerId: 'currentUser', // Placeholder for actual current user ID
    vendorId: 'v1',
    items: [{ productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 1 }],
    totalAmount: 12.99,
    status: 'Delivered',
    pickupAddress: 'Awesome Eats, 123 Food Lane, Culinary City',
    deliveryAddress: 'My Home, 456 Customer Ave, Suburbia',
    deliveryFee: 5.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 48), // 2 days ago
    deliveryAgentId: 'da001',
  },
  {
    id: 'custOrder002',
    customerId: 'currentUser',
    vendorId: 'v2',
    items: [
      { productId: '3', name: 'Ultimate Chicken Burger', price: 9.50, quantity: 2 },
      { productId: '7', name: 'Sparkling Cola', price: 2.50, quantity: 2 },
    ],
    totalAmount: 24.00,
    status: 'Out for Delivery',
    pickupAddress: 'Burger Joint, 789 Grill Rd, Flavor Town',
    deliveryAddress: 'My Office, 789 Business Park, Metroville',
    deliveryFee: 7.50,
    createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    deliveryAgentId: 'da002',
  },
  {
    id: 'custOrder003',
    customerId: 'currentUser',
    vendorId: 'v3',
    items: [{ productId: '5', name: 'Classic Caesar Salad', price: 7.99, quantity: 1 }],
    totalAmount: 7.99,
    status: 'Processing',
    pickupAddress: 'Healthy Greens, 101 Salad St, Fresh City',
    deliveryAddress: 'My Apartment, Bld C, Unit 10, Suburbia',
    deliveryFee: 3.00,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
  },
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // In a real app, fetch orders for the logged-in customer
    setOrders(sampleCustomerOrders);
  }, []);

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
