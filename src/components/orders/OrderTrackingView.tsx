
'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderListItem } from './OrderListItem';
import { ClipboardList, Search } from 'lucide-react';

interface OrderTrackingViewProps {
  orders: Order[];
  title: string;
  description?: string;
  userRole: 'customer' | 'vendor';
}

export function OrderTrackingView({ orders, title, description, userRole }: OrderTrackingViewProps) {
  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ClipboardList className="h-6 w-6 text-primary" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">No orders found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
          <ClipboardList className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {orders.map((order) => (
          <OrderListItem key={order.id} order={order} userRole={userRole} />
        ))}
      </CardContent>
    </Card>
  );
}
