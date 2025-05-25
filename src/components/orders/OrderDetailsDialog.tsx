
// src/components/orders/OrderDetailsDialog.tsx
'use client';

import type { Order } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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

        <ScrollArea className="flex-grow pr-2">
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
                  <div key={item.productId + index} className="p-3 bg-muted/50 rounded-md text-sm">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{item.name} (x{item.quantity})</p>
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </p>
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
                  <p className="text-sm">Agent ID: {order.deliveryAgentId}</p>
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
                  <span>${(order.totalAmount - order.deliveryFee).toFixed(2)}</span>
                </div>
                {order.deliveryPreference === 'delivery' && (
                    <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>${order.deliveryFee.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-md pt-1 border-t mt-1">
                  <span>Total Amount:</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

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
