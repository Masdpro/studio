
'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, DollarSign, Clock, Truck, CheckCircle, XCircle, Eye, PackageCheck, ShieldCheck, Star, PhoneCall, Ban, PlayCircle, Send, UserCheck, ScanLine } from 'lucide-react';
import { format } from 'date-fns';
import { BarcodeDisplay } from './BarcodeDisplay';
import { ReviewDialog } from '@/components/reviews/ReviewDialog';
import React, { useState } from 'react';

interface OrderListItemProps {
  order: Order;
  userRole: 'customer' | 'vendor' | 'delivery_agent';
  onAcceptDelivery?: (orderId: string) => void;
  onScanForPickup?: (orderId: string) => void;
  onScanForDelivery?: (orderId: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onAttendToOrder?: (orderId: string) => void;
  onMarkAsReadyForPickup?: (orderId: string) => void;
  onScanForCustomerPickup?: (orderId: string) => void; // New prop
}

const getStatusVariant = (status: Order['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Processing':
    case 'AcceptedByAgent':
      return 'default';
    case 'ReadyForPickup': // For agent
    case 'ReadyForCustomerPickup': // For customer
    case 'PickedUpByAgent':
    case 'PickedUpByCustomer':
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
    case 'ReadyForPickup': // For agent
      return <ShoppingBag className="h-4 w-4 mr-1.5 text-orange-600" />; // Distinct icon/color
    case 'ReadyForCustomerPickup': // For customer
      return <UserCheck className="h-4 w-4 mr-1.5 text-teal-600" />; // Distinct icon/color
    case 'PickedUpByCustomer':
      return <PackageCheck className="h-4 w-4 mr-1.5 text-green-600" />;
    case 'AcceptedByAgent':
      return <User className="h-4 w-4 mr-1.5" />;
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
      case 'ReadyForPickup': return 'bg-orange-100 text-orange-800 border-orange-300'; // For agent
      case 'ReadyForCustomerPickup': return 'bg-teal-100 text-teal-800 border-teal-300'; // For customer
      case 'PickedUpByCustomer': return 'bg-green-100 text-green-800 border-green-300';
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
  onScanForDelivery,
  onCancelOrder,
  onAttendToOrder,
  onMarkAsReadyForPickup,
  onScanForCustomerPickup,
}: OrderListItemProps) {
  const itemSummary = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
  const displayDate = format(new Date(order.createdAt), 'PPpp');

  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Vendor shows barcode for agent pickup if order is ReadyForPickup OR AcceptedByAgent (agent already claimed it)
  const showVendorAgentPickupBarcode = userRole === 'vendor' && order.deliveryPreference === 'delivery' && (order.status === 'ReadyForPickup' || order.status === 'AcceptedByAgent');
  // Vendor shows barcode for customer pickup if order is ReadyForCustomerPickup
  const showVendorCustomerPickupBarcode = userRole === 'vendor' && order.deliveryPreference === 'pickup' && order.status === 'ReadyForCustomerPickup';

  const showCustomerDeliveryBarcode = userRole === 'customer' && (order.status === 'PickedUpByAgent' || order.status === 'Out for Delivery');
  const canCustomerScanForPickup = userRole === 'customer' && order.status === 'ReadyForCustomerPickup' && onScanForCustomerPickup;

  const canVendorAttend = userRole === 'vendor' && order.status === 'Pending' && onAttendToOrder;

  const canVendorMarkReady = userRole === 'vendor' && order.status === 'Processing' && onMarkAsReadyForPickup;
  let vendorReadyButtonText = "Ready for Pickup";
  let vendorReadyButtonIcon = <ShoppingBag className="h-4 w-4 mr-1 sm:mr-2" />;
  if (canVendorMarkReady) {
    if (order.deliveryPreference === 'delivery') {
      vendorReadyButtonText = "Post for Delivery";
      vendorReadyButtonIcon = <Send className="h-4 w-4 mr-1 sm:mr-2" />;
    } else { // This is the 'pickup' case
      vendorReadyButtonText = "Ready for Pickup";
      vendorReadyButtonIcon = <ShoppingBag className="h-4 w-4 mr-1 sm:mr-2" />;
    }
  }

  const shouldShowViewDetailsButton = order.items.length > 1 || (userRole === 'vendor' && (order.status === 'Processing' || order.status === 'Pending'));


  const canLeaveReview = userRole === 'customer' && (order.status === 'Delivered' || order.status === 'PickedUpByCustomer');
  const canViewCustomerPhone = userRole === 'delivery_agent' && (order.status === 'PickedUpByAgent' || order.status === 'Out for Delivery');
  const canCustomerCancel = userRole === 'customer' && (order.status === 'Pending' || order.status === 'Processing') && onCancelOrder;

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
            {order.status === 'ReadyForCustomerPickup' ? 'Ready for Self-Pickup' : order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Items:</h4>
          <p className="text-sm line-clamp-2">{itemSummary}</p>
        </div>
        {userRole === 'vendor' && order.deliveryPreference && (
            <p className="text-xs text-muted-foreground">
                Customer Preference: {order.deliveryPreference === 'delivery' ? 'Delivery Requested' : 'Self Pickup'}
            </p>
        )}

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
            {showCustomerDeliveryBarcode && (
              <BarcodeDisplay orderId={order.id} label="Barcode for Delivery Confirmation" />
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
            {showVendorAgentPickupBarcode && (
              <BarcodeDisplay orderId={order.id} label="Barcode for Agent Pickup" />
            )}
            {showVendorCustomerPickupBarcode && (
              <BarcodeDisplay orderId={order.id} label="Barcode for Customer Pickup Confirmation" />
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
                {canViewCustomerPhone && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <PhoneCall className="h-3 w-3" />
                    <span>Contact: (Mock) 555-123-4567</span>
                  </div>
                )}
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
          {canVendorAttend && (
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onAttendToOrder && onAttendToOrder(order.id)}
            >
              <PlayCircle className="h-4 w-4 mr-1 sm:mr-2" />
              Attend to Order
            </Button>
          )}

          {canVendorMarkReady && (
            <Button
              variant="default"
              size="sm"
              className={order.deliveryPreference === 'delivery' ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-sky-600 hover:bg-sky-700 text-white"}
              onClick={() => onMarkAsReadyForPickup && onMarkAsReadyForPickup(order.id)}
            >
              {vendorReadyButtonIcon}
              {vendorReadyButtonText}
            </Button>
          )}

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

          {canCustomerCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancelOrder && onCancelOrder(order.id)}
            >
              <Ban className="h-4 w-4 mr-1 sm:mr-2" />
              Cancel Order
            </Button>
          )}

          {canCustomerScanForPickup && (
            <Button
              variant="outline"
              size="sm"
              className="border-teal-500 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
              onClick={() => onScanForCustomerPickup(order.id)}
            >
              <ScanLine className="h-4 w-4 mr-1 sm:mr-2" />
              Scan to Confirm Pickup
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

          {canLeaveReview && (
            <ReviewDialog
              order={order}
              onReviewSubmitted={() => setReviewSubmitted(true)}
              isReviewSubmitted={reviewSubmitted}
            />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

