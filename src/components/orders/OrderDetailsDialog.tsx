
// src/components/orders/OrderDetailsDialog.tsx
'use client';

import dynamic from 'next/dynamic';
import type { Order } from '@/lib/types';

// Leaflet touches `window` at load time, so this can only ever run client-side.
const DeliveryMapTracker = dynamic(
  () => import('./DeliveryMapTracker').then((mod) => mod.DeliveryMapTracker),
  { ssr: false, loading: () => <div className="h-48 rounded-md border bg-muted/30 animate-pulse" /> }
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SafeImage } from '@/components/ui/safe-image';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Package, User, Home, Truck, DollarSign, ClipboardList, Landmark, ShoppingBag } from 'lucide-react';

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusVariant = (status?: Order['status']): React.ComponentProps<typeof Badge>['variant'] => {
  if (!status) return 'outline';
  switch (status) {
    case 'Pending': return 'secondary';
    case 'Processing': case 'AcceptedByAgent': return 'default';
    case 'ReadyForPickup': case 'ReadyForCustomerPickup': case 'PickedUpByAgent': case 'PickedUpByCustomer': return 'outline';
    case 'Out for Delivery': return 'default';
    case 'Delivered': return 'default'; // Consider a 'success' or green variant if available/customized
    case 'Cancelled': return 'destructive';
    default: return 'outline';
  }
};

export function OrderDetailsDialog({ order, isOpen, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) {
    return null;
  }

  const displayDate = format(new Date(order.createdAt), 'PPpp');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Order Details: {order.id}
          </DialogTitle>
          <DialogDescription>
            Placed on: {displayDate}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-md mb-1">Status:</h4>
                <Badge variant={getStatusVariant(order.status)} className="text-sm">
                  {order.status === 'ReadyForCustomerPickup' ? 'Ready for Self-Pickup' : order.status}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-md mb-1">Delivery Preference:</h4>
                <p className="text-sm capitalize">{order.deliveryPreference}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-md mb-2 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" /> Items
              </h4>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.productId + index} className="flex gap-3 p-3 bg-muted/50 rounded-md text-sm">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <SafeImage
                        src={item.imageUrl || 'https://placehold.co/80x80.png'}
                        alt={item.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium">{item.name} (x{item.quantity})</p>
                        <p className="font-semibold shrink-0">₦{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      {(item.color || item.size) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.color && <Badge variant="secondary">Color: {item.color}</Badge>}
                          {item.size && <Badge variant="secondary">Size: {item.size}</Badge>}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        ₦{item.price.toLocaleString()} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Vendor</h4>
                    <p className="text-sm">ID: {order.vendorId}</p>
                    <p className="text-sm mt-1">
                        <span className="font-medium">Pickup From:</span><br /> {order.pickupAddress}
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><User className="h-5 w-5 text-primary" />Customer</h4>
                    <p className="text-sm">ID: {order.customerId}</p>
                    <p className="text-sm mt-1">
                        <span className="font-medium">Deliver To:</span><br /> {order.deliveryAddress}
                    </p>
                </div>
            </div>
            
            {order.deliveryAgentId && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-md mb-2 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> Delivery Agent
                  </h4>
                  <p className="text-sm mb-3">Agent ID: {order.deliveryAgentId}</p>
                  {order.status === 'PickedUpByAgent' && order.deliveryPreference === 'delivery' && (
                    <DeliveryMapTracker orderId={order.id} deliveryAddress={order.deliveryAddress} />
                  )}
                </div>
              </>
            )}

            <Separator />

            <div>
              <h4 className="font-semibold text-md mb-2 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Financials
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₦{(order.totalAmount - order.deliveryFee).toLocaleString()}</span>
                </div>
                {order.deliveryPreference === 'delivery' && (
                    <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>₦{order.deliveryFee.toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-md pt-1 border-t mt-1">
                  <span>Total Amount:</span>
                  <span>₦{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
