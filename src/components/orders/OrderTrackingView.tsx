
'use client';

import type { Order } from '@/lib/types';
import { OrderListItem } from './OrderListItem';
import { ClipboardList, Search } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

interface OrderTrackingViewProps {
  orders: Order[];
  title: string;
  description?: string;
  userRole: 'customer' | 'vendor';
  onCancelOrder?: (orderId: string) => void;
  onAttendToOrder?: (orderId: string) => void;
  onMarkAsReadyForPickup?: (orderId: string) => void;
  onDeclineOrder?: (orderId: string) => void;
}

export function OrderTrackingView({
  orders,
  title,
  description,
  userRole,
  onCancelOrder,
  onAttendToOrder,
  onMarkAsReadyForPickup,
  onDeclineOrder,
}: OrderTrackingViewProps) {
  // A plain page heading and a list of order cards (no card around the cards).
  const heading = (
    <div className="mb-4 space-y-1">
      <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
        <ClipboardList className="h-6 w-6 text-primary md:h-7 md:w-7" />
        {title}
        {description && <InfoTip>{description}</InfoTip>}
      </h1>
    </div>
  );

  if (!orders || orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        {heading}
        <div className="rounded-2xl border bg-card px-6 py-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {heading}
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderListItem
            key={order.id}
            order={order}
            userRole={userRole}
            onCancelOrder={userRole === 'customer' ? onCancelOrder : undefined}
            onAttendToOrder={userRole === 'vendor' ? onAttendToOrder : undefined}
            onMarkAsReadyForPickup={userRole === 'vendor' ? onMarkAsReadyForPickup : undefined}
            onDeclineOrder={userRole === 'vendor' ? onDeclineOrder : undefined}
          />
        ))}
      </div>
    </div>
  );
}

