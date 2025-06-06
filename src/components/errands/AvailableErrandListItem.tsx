
'use client';

import type { ErrandRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBasket, MapPin, Store, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AvailableErrandListItemProps {
  errand: ErrandRequest;
  onViewDetailsAndQuote?: (errandId: string) => void; // For future implementation
}

export function AvailableErrandListItem({ errand, onViewDetailsAndQuote }: AvailableErrandListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(errand.createdAt), { addSuffix: true });

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            New Errand Request
          </CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo}
          </span>
        </div>
         <CardDescription className="text-xs md:text-sm pt-1">
            Customer ID: {errand.customerId.substring(0, 7)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">Items Summary:</h4>
          <p className="text-sm line-clamp-3 whitespace-pre-line">{errand.itemsDescription}</p>
        </div>
        {errand.preferredStore && (
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Preferred Store: {errand.preferredStore}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Delivery Area: {errand.deliveryAddress.split(',').slice(-2).join(', ').trim() || 'Not specified'}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Button
          className="w-full"
          onClick={() => onViewDetailsAndQuote && onViewDetailsAndQuote(errand.id)}
          disabled // Enable this when quote functionality is added
        >
          View Details & Submit Quote (Soon) <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
