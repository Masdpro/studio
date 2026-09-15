
// src/app/(app)/delivery-agent/errands/browse/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { AvailableErrandListItem } from '@/components/errands/AvailableErrandListItem';
import { SubmitQuoteDialog } from '@/components/errands/SubmitQuoteDialog'; // Import the dialog
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, ShoppingBasket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BrowseErrandsPage() {
  const [availableErrands, setAvailableErrands] = useState<ErrandRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // State for SubmitQuoteDialog
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [selectedErrandForQuote, setSelectedErrandForQuote] = useState<ErrandRequest | null>(null);

  const loadErrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/errands');
      if (!res.ok) throw new Error('Failed to load available errands.');
      const { errands } = (await res.json()) as { errands: ErrandRequest[] };
      setAvailableErrands(errands);
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to load available errands.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadErrands();
  }, [loadErrands]);

  const handleOpenQuoteDialog = (errandId: string) => {
    const errandToQuote = availableErrands.find(e => e.id === errandId);
    if (errandToQuote) {
      setSelectedErrandForQuote(errandToQuote);
      setIsQuoteDialogOpen(true);
    }
  };

  const handleSubmitQuote = async (
    quoteData: Omit<ErrandQuote, 'id' | 'errandRequestId' | 'agentId' | 'totalEstimatedCost' | 'status' | 'createdAt'>
  ) => {
    if (!selectedErrandForQuote) return;

    try {
      const res = await fetch(`/api/errands/${selectedErrandForQuote.id}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to submit quote.' }));
        throw new Error(error ?? 'Failed to submit quote.');
      }
      setAvailableErrands(prev => prev.filter(errand => errand.id !== selectedErrandForQuote.id));
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to submit quote.',
        variant: 'destructive',
      });
    } finally {
      setSelectedErrandForQuote(null);
    }
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
