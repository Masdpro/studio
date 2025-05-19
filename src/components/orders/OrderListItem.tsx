
'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, DollarSign, Clock, Truck, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface OrderListItemProps {
  order: Order;
  userRole: 'customer' | 'vendor';
}

const getStatusVariant = (status: Order['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Processing':
      return 'default'; // Using default as a general "in progress"
    case 'ReadyForPickup':
      return 'outline'; // Or choose another if default is used for processing
    case 'Out for Delivery':
      return 'default'; // Could also be 'secondary' with different color if theme supports
    case 'Delivered':
      return 'default'; // Success variant if available, or green text
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
      case 'Out for Delivery': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};


export function OrderListItem({ order, userRole }: OrderListItemProps) {
  const itemSummary = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
  const displayDate = format(new Date(order.createdAt), 'PPpp'); // e.g., Aug 17, 2023, 10:30:00 AM

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
      <CardContent className="pb-3 space-y-2">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Items:</h4>
          <p className="text-sm line-clamp-2">{itemSummary}</p>
        </div>
        {userRole === 'vendor' && (
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Customer:</h4>
            <p className="text-sm">{order.customerId} (Details placeholder)</p>
            <p className="text-xs text-muted-foreground">Delivery to: {order.deliveryAddress}</p>
          </div>
        )}
        {userRole === 'customer' && (
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Vendor:</h4>
            <p className="text-sm">{order.vendorId} (Details placeholder)</p>
             <p className="text-xs text-muted-foreground">Pickup from: {order.pickupAddress}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-3 border-t">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-primary mr-1" />
          <span className="font-semibold text-md">Total: ${order.totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          {order.deliveryAgentId && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Truck className="h-4 w-4 mr-1" />
              Agent: {order.deliveryAgentId}
            </div>
          )}
          {order.items.length > 1 && (
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
