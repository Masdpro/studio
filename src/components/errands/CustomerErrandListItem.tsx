
'use client';

import type { ErrandRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBasket, Clock, CheckCircle, XCircle, Hourglass, AlertTriangle, Truck, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerErrandListItemProps {
  errand: ErrandRequest;
  // onViewQuotes?: (errandId: string) => void; // For future implementation
  // onCancelErrand?: (errandId: string) => void; // For future implementation
}

const getStatusVariant = (status: ErrandRequest['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'PendingQuotes':
    case 'AwaitingAcceptance':
      return 'secondary';
    case 'AgentAssigned':
    case 'InProgress':
    case 'OutForDelivery':
      return 'default';
    case 'Delivered':
      return 'default'; // Consider 'success'
    case 'CancelledByCustomer':
    case 'CancelledByAgent':
    case 'Expired':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusIcon = (status: ErrandRequest['status']) => {
  switch (status) {
    case 'PendingQuotes': return <Hourglass className="h-4 w-4 mr-1.5" />;
    case 'AwaitingAcceptance': return <UserCheck className="h-4 w-4 mr-1.5 text-blue-500" />;
    case 'AgentAssigned': return <UserCheck className="h-4 w-4 mr-1.5 text-green-500" />;
    case 'InProgress': return <ShoppingBasket className="h-4 w-4 mr-1.5" />;
    case 'OutForDelivery': return <Truck className="h-4 w-4 mr-1.5" />;
    case 'Delivered': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
    case 'CancelledByCustomer':
    case 'CancelledByAgent':
      return <XCircle className="h-4 w-4 mr-1.5" />;
    case 'Expired': return <AlertTriangle className="h-4 w-4 mr-1.5" />;
    default: return <Clock className="h-4 w-4 mr-1.5" />;
  }
};

export function CustomerErrandListItem({ errand }: CustomerErrandListItemProps) {
  const displayDate = format(new Date(errand.createdAt), 'PPpp');

  const getDisplayStatusText = (status: ErrandRequest['status']) => {
    const map = {
        PendingQuotes: "Pending Quotes",
        AwaitingAcceptance: "Awaiting Your Acceptance",
        AgentAssigned: "Agent Assigned",
        InProgress: "In Progress",
        OutForDelivery: "Out for Delivery",
        Delivered: "Delivered",
        CancelledByCustomer: "Cancelled by You",
        CancelledByAgent: "Cancelled by Agent",
        Expired: "Expired"
    };
    return map[status] || status;
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-primary" />
              Errand: {errand.id.substring(0,8)}...
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Requested on: {displayDate}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(errand.status)} className="flex items-center text-xs md:text-sm">
            {getStatusIcon(errand.status)}
            {getDisplayStatusText(errand.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Items Requested:</h4>
          <p className="text-sm line-clamp-3 whitespace-pre-line">{errand.itemsDescription}</p>
        </div>
        {errand.preferredStore && (
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Preferred Store:</h4>
            <p className="text-sm">{errand.preferredStore}</p>
          </div>
        )}
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Delivery To:</h4>
          <p className="text-sm">{errand.deliveryAddress}</p>
        </div>
        {errand.assignedAgentId && (
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Assigned Agent:</h4>
            <p className="text-sm">{errand.assignedAgentId}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t gap-2">
        <div className="text-sm text-muted-foreground">
          {/* Placeholder for total cost if available */}
          {errand.status === 'Delivered' && errand.finalTotalCost ? (
            <span>Total Paid: ${errand.finalTotalCost.toFixed(2)}</span>
          ) : errand.estimatedTotalItemCost && errand.deliveryFee ? (
            <span>Est. Total: ${(errand.estimatedTotalItemCost + errand.deliveryFee).toFixed(2)}</span>
          ) : (
            <span>Awaiting Quotes...</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {errand.status === 'PendingQuotes' && (
            <Button variant="outline" size="sm" disabled>View Quotes (Soon)</Button>
          )}
           {/* Add more actions here based on status in future iterations */}
           {/* e.g., Cancel Errand, View Agent Profile, Mark as Received */}
        </div>
      </CardFooter>
    </Card>
  );
}
