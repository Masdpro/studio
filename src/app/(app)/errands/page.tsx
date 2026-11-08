
// src/app/(app)/errands/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { CustomerErrandListItem } from '@/components/errands/CustomerErrandListItem';
import { ViewQuotesDialog } from '@/components/errands/ViewQuotesDialog';
import { Button } from '@/components/ui/button';
import { CreateErrandRequestForm } from '@/components/errands/CreateErrandRequestForm';
import { ClipboardList, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type QuoteWithAgentName = ErrandQuote & { agentName: string };

/** One page for errands: request a new one at the top, follow the ones you already have below. */
export default function ErrandsPage() {
  const [errands, setErrands] = useState<ErrandRequest[]>([]);
  // The request form opens on its own when you have no errands yet, or when you arrive from an old "create" link.
  const [formOpen, setFormOpen] = useState(false);
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
    if (new URLSearchParams(window.location.search).has('new')) setFormOpen(true);
    loadErrands();
  }, [loadErrands]);

  const handleCreated = async () => {
    setFormOpen(false);
    window.history.replaceState(null, '', '/errands');
    await loadErrands();
  };

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


  const showForm = formOpen || (!isLoading && errands.length === 0);

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-primary">
            <ClipboardList className="h-8 w-8" />
            Errands
          </h1>
          <p className="mt-1 text-muted-foreground">Ask an agent to buy and deliver anything, then follow it here.</p>
        </div>
        {!showForm && (
          <Button size="lg" onClick={() => setFormOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" /> New errand
          </Button>
        )}
      </div>

      {showForm && (
        <CreateErrandRequestForm
          className="mb-8 max-w-none"
          onCreated={handleCreated}
          onCancel={errands.length > 0 ? () => setFormOpen(false) : undefined}
        />
      )}

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Loading your errands...</p>
        </div>
      ) : errands.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your errands</h2>
          <div className="space-y-6">
            {errands.map((errand) => (
              <CustomerErrandListItem
                key={errand.id}
                errand={errand}
                pendingQuoteCount={pendingQuoteCounts[errand.id] ?? 0}
                onViewQuotes={handleViewQuotes}
                onAcceptQuote={handleAcceptQuote}
              />
            ))}
          </div>
        </section>
      ) : null}
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
