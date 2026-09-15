
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
import { useToast } from '@/hooks/use-toast';

type QuoteWithAgentName = ErrandQuote & { agentName: string };

export default function MyErrandsPage() {
  const [errands, setErrands] = useState<ErrandRequest[]>([]);
  const [pendingQuoteCounts, setPendingQuoteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // State for ViewQuotesDialog
  const [isQuotesDialogOpen, setIsQuotesDialogOpen] = useState(false);
  const [selectedErrandForQuotes, setSelectedErrandForQuotes] = useState<ErrandRequest | null>(null);
  const [quotesForSelectedErrand, setQuotesForSelectedErrand] = useState<QuoteWithAgentName[]>([]);

  const loadErrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/errands');
      if (!res.ok) throw new Error('Failed to load errands.');
      const { errands: fetchedErrands } = (await res.json()) as { errands: ErrandRequest[] };
      setErrands(fetchedErrands);

      const awaitingAcceptance = fetchedErrands.filter((e) => e.status === 'AwaitingAcceptance');
      const counts: Record<string, number> = {};
      await Promise.all(
        awaitingAcceptance.map(async (errand) => {
          const quotesRes = await fetch(`/api/errands/${errand.id}/quotes`);
          if (!quotesRes.ok) return;
          const { quotes } = (await quotesRes.json()) as { quotes: QuoteWithAgentName[] };
          counts[errand.id] = quotes.filter((q) => q.status === 'Pending').length;
        })
      );
      setPendingQuoteCounts(counts);
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to load your errands.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadErrands();
  }, [loadErrands]);

  const handleViewQuotes = async (errandId: string) => {
    const errand = errands.find((e) => e.id === errandId);
    if (!errand) return;
    try {
      const res = await fetch(`/api/errands/${errandId}/quotes`);
      if (!res.ok) throw new Error('Failed to load quotes.');
      const { quotes } = (await res.json()) as { quotes: QuoteWithAgentName[] };
      setSelectedErrandForQuotes(errand);
      setQuotesForSelectedErrand(quotes.filter((q) => q.status === 'Pending'));
      setIsQuotesDialogOpen(true);
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to load quotes.',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptQuote = async (errandId: string, quoteId: string) => {
    try {
      const res = await fetch(`/api/errands/${errandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedQuoteId: quoteId }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to accept quote.' }));
        throw new Error(error ?? 'Failed to accept quote.');
      }
      toast({ title: 'Quote Accepted!', description: 'An agent has been assigned to your errand.' });
      setIsQuotesDialogOpen(false);
      await loadErrands();
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to accept quote.',
        variant: 'destructive',
      });
    }
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
              pendingQuoteCount={pendingQuoteCounts[errand.id] ?? 0}
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
