
'use client';

import { STATUS_LABEL } from '@/lib/order-status-label';
import type { Order } from '@/lib/types';
import { orderMachine, ORDER_COMPLETED, type OrderActor } from '@/lib/state-machines';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, ShoppingBag, Clock, Truck, CheckCircle, XCircle, Eye, PackageCheck, ShieldCheck, Ban, PlayCircle, Send, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { CustomerDeliveryCode, DeliveryCodeDialog } from './DeliveryCode';
import { ReviewDialog } from '@/components/reviews/ReviewDialog';
import React, { useState } from 'react';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface OrderListItemProps {
  order: Order;
  userRole: 'customer' | 'vendor' | 'delivery_agent';
  onAcceptDelivery?: (orderId: string) => void;
  onScanForPickup?: (orderId: string) => void;
  onScanForDelivery?: (orderId: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onAttendToOrder?: (orderId: string) => void;
  onMarkAsReadyForPickup?: (orderId: string) => void;
  onDeclineOrder?: (orderId: string) => void;
}


/** One labelled detail line: icon, small label, then the value. */
function InfoLine({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words leading-snug">{children}</p>
      </div>
    </div>
  );
}

const getStatusVariant = (status: Order['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Processing':
    case 'AcceptedByAgent':
      return 'default';
    case 'ReadyForPickup':
    case 'ReadyForCustomerPickup':
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
      return <Clock className="h-3 w-3 mr-1" />;
    case 'Processing':
      return <Package className="h-3 w-3 mr-1" />;
    case 'ReadyForPickup':
      return <ShoppingBag className="h-3 w-3 mr-1 text-orange-600" />;
    case 'ReadyForCustomerPickup':
      return <UserCheck className="h-3 w-3 mr-1 text-teal-600" />;
    case 'PickedUpByCustomer':
      return <PackageCheck className="h-3 w-3 mr-1 text-green-600" />;
    case 'AcceptedByAgent':
      return <User className="h-3 w-3 mr-1" />;
    case 'PickedUpByAgent':
      return <PackageCheck className="h-3 w-3 mr-1 text-blue-600" />;
    case 'Out for Delivery':
      return <Truck className="h-3 w-3 mr-1" />;
    case 'Delivered':
      return <CheckCircle className="h-3 w-3 mr-1 text-green-600" />;
    case 'Cancelled':
      return <XCircle className="h-3 w-3 mr-1" />;
    default:
      return <Clock className="h-3 w-3 mr-1" />;
  }
};

const getStatusColorClass = (status: Order['status']): string => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ReadyForPickup': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ReadyForCustomerPickup': return 'bg-teal-100 text-teal-800 border-teal-300';
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
  order: orderProp,
  userRole,
  onAcceptDelivery,
  onScanForPickup,
  onScanForDelivery,
  onCancelOrder,
  onAttendToOrder,
  onMarkAsReadyForPickup,
  onDeclineOrder,
}: OrderListItemProps) {
  // After the shop enters a pickup code here, show the new status straight away.
  const [localStatus, setLocalStatus] = useState<Order['status'] | null>(null);
  const order = localStatus ? { ...orderProp, status: localStatus } : orderProp;
  const [codeOpen, setCodeOpen] = useState(false);
  // Cancelling / declining refunds the customer and can't be undone, so ask first.
  const [confirming, setConfirming] = useState<null | 'cancel' | 'decline' | 'collect'>(null);
  const itemSummary = order.items.map(item => `${item.name} (x${item.quantity}${item.color ? `, ${item.color}` : ''}${item.size ? `, ${item.size}` : ''})`).join(', ');
  const shortDate = format(new Date(order.createdAt), 'd MMM, h:mm a');
  // Who the order is with, from this person's side.
  const headline =
    userRole === 'customer' ? order.vendorName ?? 'Your order'
      : userRole === 'vendor' ? (order.customerName ? `Order for ${order.customerName}` : 'Customer order')
        : order.vendorName ?? 'Delivery';

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);


  // The customer's 4-digit code: for delivery once a rider is on it, for pickup from the moment it's ordered.
  const showCustomerCode =
    userRole === 'customer' &&
    (order.deliveryPreference === 'delivery'
      ? ['AcceptedByAgent', 'PickedUpByAgent', 'Out for Delivery'].includes(order.status)
      : ['Pending', 'Processing', 'ReadyForCustomerPickup'].includes(order.status));
  // Which buttons to show comes from the same rules the server enforces (src/lib/state-machines/order.ts).
  const can = (to: Order['status'], actor: OrderActor) => orderMachine.can(order.status, to, actor);
  // The shop hands over a pickup order by entering the customer's code.
  const canVendorConfirmPickup = userRole === 'vendor' && can('PickedUpByCustomer', 'vendor');

  const canVendorAttend = userRole === 'vendor' && can('Processing', 'vendor') && onAttendToOrder;

  const canVendorMarkReady = userRole === 'vendor' && (can('ReadyForPickup', 'vendor') || can('ReadyForCustomerPickup', 'vendor')) && onMarkAsReadyForPickup;
  let vendorReadyButtonText = "Ready for Pickup";
  let vendorReadyButtonIcon = <ShoppingBag className="h-4 w-4 mr-1 sm:mr-2" />;
  if (canVendorMarkReady) {
    if (order.deliveryPreference === 'delivery') {
      vendorReadyButtonText = "Post for Delivery";
      vendorReadyButtonIcon = <Send className="h-4 w-4 mr-1 sm:mr-2" />;
    } else {
      vendorReadyButtonText = "Ready for Pickup";
      vendorReadyButtonIcon = <ShoppingBag className="h-4 w-4 mr-1 sm:mr-2" />;
    }
  }

  const shouldShowViewDetailsButton =
    order.items.length > 1 ||
    (userRole === 'vendor' && (order.status === 'Processing' || order.status === 'Pending')) ||
    (userRole === 'customer' && order.status === 'PickedUpByAgent' && order.deliveryPreference === 'delivery');


  const canLeaveReview = userRole === 'customer' && ORDER_COMPLETED.includes(order.status);
  const canCustomerCancel = userRole === 'customer' && can('Cancelled', 'customer') && onCancelOrder;
  const canVendorDecline = userRole === 'vendor' && can('Cancelled', 'vendor') && onDeclineOrder;

  const handleViewDetailsClick = () => {
    setIsDetailsDialogOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden rounded-2xl shadow-sm">
        <CardHeader className="space-y-1 p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="min-w-0 truncate text-base font-bold leading-snug sm:text-lg">{headline}</CardTitle>
            <Badge variant={getStatusVariant(order.status)} className={`shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px] font-semibold ${getStatusColorClass(order.status)}`}>
              {getStatusIcon(order.status)}
              {STATUS_LABEL[order.status] ?? order.status}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            #{order.id.slice(0, 8).toUpperCase()} · {shortDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-3 pt-0 text-sm">
          <p className="line-clamp-2">{itemSummary}</p>

          {userRole === 'customer' && (
            <>
              <InfoLine icon={order.deliveryPreference === 'delivery' ? Truck : ShoppingBag} label={order.deliveryPreference === 'delivery' ? 'Deliver to' : 'Collect from'}>
                {order.deliveryPreference === 'delivery' ? order.deliveryAddress : order.pickupAddress}
              </InfoLine>
              {order.agentName && <InfoLine icon={User} label="Rider">{order.agentName}</InfoLine>}
              {showCustomerCode && (
                <CustomerDeliveryCode orderId={order.id} pickup={order.deliveryPreference === 'pickup'} />
              )}
            </>
          )}

          {userRole === 'vendor' && (
            <>
              <InfoLine icon={order.deliveryPreference === 'delivery' ? Truck : UserCheck} label={order.deliveryPreference === 'delivery' ? 'Delivery to' : 'Customer collects'}>
                {order.deliveryPreference === 'delivery' ? order.deliveryAddress : order.deliveryAddress || 'At your shop'}
              </InfoLine>
              {order.agentName && <InfoLine icon={User} label="Rider">{order.agentName}</InfoLine>}
            </>
          )}

          {userRole === 'delivery_agent' && (
            <>
              <InfoLine icon={Package} label={`Collect from ${order.vendorName ?? 'the shop'}`}>{order.pickupAddress}</InfoLine>
              <InfoLine icon={User} label={`Deliver to ${order.customerName ?? 'the customer'}`}>{order.deliveryAddress}</InfoLine>
              {order.estimatedDistance && <p className="text-xs text-muted-foreground">About {order.estimatedDistance}</p>}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t p-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <span className="text-base font-bold text-primary">
               {userRole === 'delivery_agent' ? `Fee: ₦${order.deliveryFee.toLocaleString()}` : `Total: ₦${order.totalAmount.toLocaleString()}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end [&>button]:flex-1 sm:[&>button]:flex-none">
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

            {userRole === 'delivery_agent' && can('AcceptedByAgent', 'agent') && !order.deliveryAgentId && onAcceptDelivery && (
              <Button className="bg-primary hover:bg-primary/80" onClick={() => onAcceptDelivery(order.id)}>
                Accept Delivery
              </Button>
            )}
            {userRole === 'delivery_agent' && can('PickedUpByAgent', 'agent') && onScanForPickup && (
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => setConfirming('collect')}>
                <PackageCheck className="h-4 w-4 mr-2" /> I&apos;ve collected it
              </Button>
            )}
            {canVendorConfirmPickup && (
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setCodeOpen(true)}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Enter pickup code
              </Button>
            )}
            {userRole === 'delivery_agent' && can('Delivered', 'agent') && onScanForDelivery && (
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onScanForDelivery(order.id)}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Enter delivery code
              </Button>
            )}

            {canVendorDecline && (
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setConfirming('decline')}>
                <Ban className="h-4 w-4 mr-1 sm:mr-2" />
                Decline
              </Button>
            )}

            {canCustomerCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirming('cancel')}
              >
                <Ban className="h-4 w-4 mr-1 sm:mr-2" />
                Cancel Order
              </Button>
            )}


            {shouldShowViewDetailsButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetailsClick}
                aria-label="View order details"
                className="px-2 sm:px-3"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-1">View Details</span>
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
      <AlertDialog open={confirming !== null} onOpenChange={(o) => { if (!o) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming === 'collect' ? 'Collected from the shop?' : confirming === 'decline' ? 'Decline this order?' : 'Cancel this order?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === 'collect'
                ? 'Only confirm once you have the order with you. The customer then gets their delivery code.'
                : confirming === 'decline'
                ? `The customer will be refunded ₦${order.totalAmount.toLocaleString()} to their wallet and told you couldn't fulfil it. This can't be undone.`
                : `₦${order.totalAmount.toLocaleString()} will be refunded to your wallet. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{confirming === 'collect' ? 'Not yet' : 'Keep order'}</AlertDialogCancel>
            <AlertDialogAction
              className={confirming === 'collect' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
              onClick={() => {
                if (confirming === 'collect') onScanForPickup?.(order.id);
                else if (confirming === 'decline') onDeclineOrder?.(order.id);
                else onCancelOrder?.(order.id);
                setConfirming(null);
              }}
            >
              {confirming === 'collect' ? 'Yes, collected' : confirming === 'decline' ? 'Decline order' : 'Cancel order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {canVendorConfirmPickup && (
        <DeliveryCodeDialog pickup orderId={order.id} open={codeOpen} onOpenChange={setCodeOpen} onDelivered={() => setLocalStatus('PickedUpByCustomer')} />
      )}
      {isDetailsDialogOpen && (
        <OrderDetailsDialog
          order={order}
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
      )}
    </>
  );
}
