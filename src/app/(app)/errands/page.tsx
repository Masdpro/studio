
// src/app/(app)/errands/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { CustomerErrandListItem } from '@/components/errands/CustomerErrandListItem';
import { ViewQuotesDialog } from '@/components/errands/ViewQuotesDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShoppingBasket, PlusCircle, Loader2, Search } from 'lucide-react';
import { sampleErrandRequests, sampleErrandQuotes } from '@/lib/mockData'; 
import { useToast } from '@/hooks/use-toast';

// Simulate a logged-in customer
const MOCK_CURRENT_CUSTOMER_ID = 'cust001'; // John Doe

export default function MyErrandsPage() {
  const [errands, setErrands] = useState<ErrandRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // State for ViewQuotesDialog
  const [isQuotesDialogOpen, setIsQuotesDialogOpen] = useState(false);
  const [selectedErrandForQuotes, setSelectedErrandForQuotes] = useState<ErrandRequest | null>(null);
  const [quotesForSelectedErrand, setQuotesForSelectedErrand] = useState<ErrandQuote[]>([]);


  useEffect(() => {
    setIsLoading(true);
    // In a real app, fetch errand requests for the logged-in customer
    const customerErrands = sampleErrandRequests.filter(
      (errand) => errand.customerId === MOCK_CURRENT_CUSTOMER_ID
    ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    setErrands(customerErrands);
    setIsLoading(false);
  }, []);

  const handleViewQuotes = (errandId: string) => {
    const errand = errands.find(e => e.id === errandId);
    if (errand) {
      const quotes = sampleErrandQuotes.filter(q => q.errandRequestId === errandId && q.status === 'Pending');
      setSelectedErrandForQuotes(errand);
      setQuotesForSelectedErrand(quotes);
      setIsQuotesDialogOpen(true);
    }
  };
  
  const handleAcceptQuote = (errandId: string, quoteId: string) => {
    // This is where the full logic for accepting a quote will go.
    // For now, just a console log and a toast.
    console.log(`Customer accepting quote ${quoteId} for errand ${errandId}`);
    toast({
      title: 'Accepting Quote (Mock)',
      description: `Acceptance logic for quote ${quoteId.substring(0,8)} on errand ${errandId.substring(0,8)} is not fully implemented yet.`,
    });
    // In a real app:
    // 1. API call to update ErrandRequest status to 'AgentAssigned'
    // 2. Update ErrandRequest with assignedAgentId, acceptedQuoteId, estimated costs from quote
    // 3. Update accepted ErrandQuote status to 'Accepted'
    // 4. Update other ErrandQuotes for this errand to 'Rejected' or 'Expired'
    // 5. Update local state for 'errands' to reflect the change
    setIsQuotesDialogOpen(false); // Close the dialog
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your errands...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex-grow">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShoppingBasket className="h-8 w-8" />
            My Errand Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your custom shopping requests and manage quotes from agents.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/errands/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Errand
          </Link>
        </Button>
      </div>

      {errands.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-2">No Errands Yet!</h3>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't requested any errands. Get started by creating one.
            </p>
            <Button asChild>
              <Link href="/errands/create">Create Your First Errand</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {errands.map((errand) => (
            <CustomerErrandListItem
              key={errand.id}
              errand={errand}
              onViewQuotes={handleViewQuotes}
              onAcceptQuote={handleAcceptQuote} // Pass down
            />
          ))}
        </div>
      )}
      {selectedErrandForQuotes && (
        <ViewQuotesDialog
          errand={selectedErrandForQuotes}
          quotes={quotesForSelectedErrand}
          isOpen={isQuotesDialogOpen}
          onOpenChange={setIsQuotesDialogOpen}
          onAcceptQuote={handleAcceptQuote}
        />
      )}
    </div>
  );
}
