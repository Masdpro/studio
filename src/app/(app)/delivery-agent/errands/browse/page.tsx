
// src/app/(app)/delivery-agent/errands/browse/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ErrandRequest } from '@/lib/types';
import { AvailableErrandListItem } from '@/components/errands/AvailableErrandListItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, ShoppingBasket } from 'lucide-react';
import { sampleErrandRequests } from '@/lib/mockData'; // Using master list

export default function BrowseErrandsPage() {
  const [availableErrands, setAvailableErrands] = useState<ErrandRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // In a real app, fetch errand requests that are 'PendingQuotes'
    // and potentially filter by agent's location/capabilities
    const openForQuoteErrands = sampleErrandRequests.filter(
      (errand) => errand.status === 'PendingQuotes' && !errand.assignedAgentId
    ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    setAvailableErrands(openForQuoteErrands);
    setIsLoading(false);
  }, []);

  // Future: Handler for when an agent decides to quote on an errand
  const handleViewAndQuote = (errandId: string) => {
    console.log("Agent wants to quote on errand:", errandId);
    // This would typically open a dialog or navigate to a quoting page
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading available errands...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <Search className="h-8 w-8" />
          Browse Available Errands
        </h1>
        <p className="text-muted-foreground mt-1">
          Find errand requests from customers and submit your quotes.
        </p>
      </div>

      {availableErrands.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <ShoppingBasket className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Errands Available Right Now</h3>
            <p className="text-muted-foreground">
              Check back later for new errand requests from customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableErrands.map((errand) => (
            <AvailableErrandListItem
              key={errand.id}
              errand={errand}
              onViewDetailsAndQuote={handleViewAndQuote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
