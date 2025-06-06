
// src/app/(app)/delivery-agent/errands/browse/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { AvailableErrandListItem } from '@/components/errands/AvailableErrandListItem';
import { SubmitQuoteDialog } from '@/components/errands/SubmitQuoteDialog'; // Import the dialog
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, ShoppingBasket } from 'lucide-react';
import { sampleErrandRequests, sampleErrandQuotes, sampleDeliveryAgents } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

// Simulate a logged-in delivery agent
const MOCK_CURRENT_AGENT_ID = sampleDeliveryAgents[0].id; // Alex Rider

export default function BrowseErrandsPage() {
  const [availableErrands, setAvailableErrands] = useState<ErrandRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // State for SubmitQuoteDialog
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [selectedErrandForQuote, setSelectedErrandForQuote] = useState<ErrandRequest | null>(null);

  useEffect(() => {
    setIsLoading(true);
    // Filter errands that are 'PendingQuotes' or 'AwaitingAcceptance' and don't already have a quote from THIS agent
    const openForQuoteErrands = sampleErrandRequests.filter((errand) => {
      const hasAgentAlreadyQuoted = sampleErrandQuotes.some(
        (quote) => quote.errandRequestId === errand.id && quote.agentId === MOCK_CURRENT_AGENT_ID
      );
      return (errand.status === 'PendingQuotes' || errand.status === 'AwaitingAcceptance') && !errand.assignedAgentId && !hasAgentAlreadyQuoted;
    }).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    setAvailableErrands(openForQuoteErrands);
    setIsLoading(false);
  }, []);

  const handleOpenQuoteDialog = (errandId: string) => {
    const errandToQuote = availableErrands.find(e => e.id === errandId);
    if (errandToQuote) {
      setSelectedErrandForQuote(errandToQuote);
      setIsQuoteDialogOpen(true);
    }
  };

  const handleSubmitQuote = (
    quoteData: Omit<ErrandQuote, 'id' | 'errandRequestId' | 'agentId' | 'totalEstimatedCost' | 'status' | 'createdAt'>
  ) => {
    if (!selectedErrandForQuote) return;

    const newQuote: ErrandQuote = {
      ...quoteData,
      id: `quote${Date.now()}`,
      errandRequestId: selectedErrandForQuote.id,
      agentId: MOCK_CURRENT_AGENT_ID,
      totalEstimatedCost: quoteData.estimatedItemCost + quoteData.deliveryFee,
      status: 'Pending',
      createdAt: new Date(),
    };

    // Mock: Add to sampleErrandQuotes (in a real app, this would be an API call)
    sampleErrandQuotes.push(newQuote);
    console.log("New quote submitted:", newQuote);

    // Mock: Update errand status if it was PendingQuotes
    setAvailableErrands(prev => prev.map(errand => 
        errand.id === selectedErrandForQuote.id && errand.status === 'PendingQuotes' 
        ? {...errand, status: 'AwaitingAcceptance'} 
        : errand
    ).filter(errand => errand.id !== selectedErrandForQuote.id)); // Remove from available if quoted

    setSelectedErrandForQuote(null); // Reset
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
            <h3 className="text-xl font-semibold mb-2">No New Errands to Quote On</h3>
            <p className="text-muted-foreground">
              Check back later for new errand requests or you may have already quoted on all available ones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableErrands.map((errand) => (
            <AvailableErrandListItem
              key={errand.id}
              errand={errand}
              onViewDetailsAndQuote={handleOpenQuoteDialog}
            />
          ))}
        </div>
      )}
      {selectedErrandForQuote && (
        <SubmitQuoteDialog
          errand={selectedErrandForQuote}
          isOpen={isQuoteDialogOpen}
          onOpenChange={setIsQuoteDialogOpen}
          onSubmitQuote={handleSubmitQuote}
        />
      )}
    </div>
  );
}
