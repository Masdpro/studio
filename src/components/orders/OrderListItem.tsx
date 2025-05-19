
'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, DollarSign, Clock, Truck, CheckCircle, XCircle, Eye, PackageCheck, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface OrderListItemProps {
  order: Order;
  userRole: 'customer' | 'vendor' | 'delivery_agent'; // Added delivery_agent
  onAcceptDelivery?: (orderId: string) => void;
  onScanForPickup?: (orderId: string) => void;
  onScanForDelivery?: (orderId: string) => void;
}

const getStatusVariant = (status: Order['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Processing':
    case 'AcceptedByAgent':
      return 'default';
    case 'ReadyForPickup':
    case 'PickedUpByAgent':
      return 'outline';
    case 'Out for Delivery':
      return 'default';
    case 'Delivered':
      return 'default';
    case 'Cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'Pending':
      return <Clock className="h-4 w-4 mr-1.5" />;
    case 'Processing':
      return <Package className="h-4 w-4 mr-1.5" />;
    case 'ReadyForPickup':
      return <ShoppingBag className="h-4 w-4 mr-1.5" />;
    case 'AcceptedByAgent':
      return <User className="h-4 w-4 mr-1.5" />; // Or a specific "agent accepted" icon
    case 'PickedUpByAgent':
      return <PackageCheck className="h-4 w-4 mr-1.5 text-blue-600" />;
    case 'Out for Delivery':
      return <Truck className="h-4 w-4 mr-1.5" />;
    case 'Delivered':
      return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
    case 'Cancelled':
      return <XCircle className="h-4 w-4 mr-1.5" />;
    default:
      return <Clock className="h-4 w-4 mr-1.5" />;
  }
};

const getStatusColorClass = (status: Order['status']): string => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ReadyForPickup': return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'AcceptedByAgent': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'PickedUpByAgent': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'Out for Delivery': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};


export function OrderListItem({
  order,
  userRole,
  onAcceptDelivery,
  onScanForPickup,
  onScanForDelivery
}: OrderListItemProps) {
  const itemSummary = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
  const displayDate = format(new Date(order.createdAt), 'PPpp'); // e.g., Aug 17, 2023, 10:30:00 AM

  const isVendorProcessing = userRole === 'vendor' && order.status === 'Processing';
  const shouldShowViewDetailsButton = order.items.length > 1 || isVendorProcessing;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg md:text-xl">Order ID: {order.id}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Placed on: {displayDate}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(order.status)} className={`flex items-center text-xs md:text-sm ${getStatusColorClass(order.status)}`}>
            {getStatusIcon(order.status)}
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Items:</h4>
          <p className="text-sm line-clamp-2">{itemSummary}</p>
        </div>

        {userRole === 'customer' && (
          <>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Vendor:</h4>
              <p className="text-sm">{order.vendorId} (Details placeholder)</p>
              <p className="text-xs text-muted-foreground">Pickup from: {order.pickupAddress}</p>
            </div>
             {order.deliveryAgentId && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Agent: {order.deliveryAgentId}
              </div>
            )}
          </>
        )}

        {userRole === 'vendor' && (
          <>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Customer:</h4>
              <p className="text-sm">{order.customerId} (Details placeholder)</p>
              <p className="text-xs text-muted-foreground">Delivery to: {order.deliveryAddress}</p>
            </div>
            {order.deliveryAgentId && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Assigned Agent: {order.deliveryAgentId}
              </div>
            )}
          </>
        )}
        
        {userRole === 'delivery_agent' && (
           <>
            <div className="flex items-start gap-2">
              <Package className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Pickup From (Vendor):</p>
                <p className="text-sm">{order.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Deliver To (Customer):</p>
                <p className="text-sm">{order.deliveryAddress}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
                Distance: {order.estimatedDistance || 'N/A'}
            </div>
           </>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t gap-2">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-primary mr-1" />
          <span className="font-semibold text-md">
             {userRole === 'delivery_agent' ? `Fee: $${order.deliveryFee.toFixed(2)}` : `Total: $${order.totalAmount.toFixed(2)}`}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {userRole === 'delivery_agent' && order.status === 'ReadyForPickup' && onAcceptDelivery && (
            <Button className="bg-primary hover:bg-primary/80" onClick={() => onAcceptDelivery(order.id)}>
              Accept Delivery
            </Button>
          )}
          {userRole === 'delivery_agent' && order.status === 'AcceptedByAgent' && onScanForPickup && (
            <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => onScanForPickup(order.id)}>
              <PackageCheck className="h-4 w-4 mr-2" /> Scan at Pickup
            </Button>
          )}
          {userRole === 'delivery_agent' && (order.status === 'PickedUpByAgent' || order.status === 'Out for Delivery') && onScanForDelivery && (
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onScanForDelivery(order.id)}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Scan at Delivery
            </Button>
          )}

          {shouldShowViewDetailsButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => console.log('View order details for:', order.id, order)}
              aria-label="View order details"
            >
              <Eye className="h-4 w-4 mr-1 sm:mr-0 md:mr-1" />
              <span className="hidden sm:inline md:inline">View Details</span>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
