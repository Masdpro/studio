
// src/components/errands/ViewQuotesDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { sampleDeliveryAgents } from '@/lib/mockData'; // To get agent names
import { User, DollarSign, MessageSquare, CheckCircle, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ViewQuotesDialogProps {
  errand: ErrandRequest | null;
  quotes: ErrandQuote[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAcceptQuote: (errandId: string, quoteId: string) => void; // Will be fully implemented later
}

export function ViewQuotesDialog({ errand, quotes, isOpen, onOpenChange, onAcceptQuote }: ViewQuotesDialogProps) {
  if (!errand) return null;

  const getAgentName = (agentId: string) => {
    const agent = sampleDeliveryAgents.find(a => a.id === agentId);
    return agent ? agent.name : `Agent ${agentId.substring(0,6)}...`;
  };
  
  // Mock agent reviews for display - in real app, this would be fetched
  const getMockAgentReviewCounts = (agentId: string) => {
    // Simple mock: alternate positive/negative counts for demo
    const hash = agentId.charCodeAt(agentId.length - 1) || 0;
    if (hash % 3 === 0) return { positive: 15, negative: 1 };
    if (hash % 3 === 1) return { positive: 8, negative: 3 };
    return { positive: 22, negative: 0 };
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Quotes for Errand: {errand.id.substring(0,8)}...
          </DialogTitle>
          <DialogDescription>
            Review the quotes submitted by delivery agents and choose the one that suits you best.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow py-4 pr-2">
          {quotes.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No quotes submitted for this errand yet.</p>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => {
                const agentName = getAgentName(quote.agentId);
                const agentReviewCounts = getMockAgentReviewCounts(quote.agentId); // Mock reviews
                const quoteTimeAgo = formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true });
                
                return (
                  <Card key={quote.id} className="shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          Quote from: {agentName}
                        </CardTitle>
                         <Badge variant={quote.status === 'Accepted' ? 'default' : 'secondary'}>{quote.status}</Badge>
                      </div>
                      <CardDescription className="text-xs">Submitted {quoteTimeAgo}</CardDescription>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-green-500" /> {agentReviewCounts.positive}
                        <ThumbsDown className="h-3.5 w-3.5 text-red-500 ml-1" /> {agentReviewCounts.negative}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Estimated Item(s) Cost:</span>
                        <span className="font-semibold text-md">${quote.estimatedItemCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Delivery Fee:</span>
                        <span className="font-semibold text-md">${quote.deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-lg font-bold text-primary pt-1 border-t mt-1">
                        <span>Total Estimated Cost:</span>
                        <span>${quote.totalEstimatedCost.toFixed(2)}</span>
                      </div>
                      {quote.agentNotes && (
                        <div className="pt-2">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" /> Agent's Notes:
                          </h4>
                          <p className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-line">{quote.agentNotes}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onAcceptQuote(errand.id, quote.id)}
                        disabled={quote.status !== 'Pending' || errand.status !== 'AwaitingAcceptance'} // Basic condition
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Accept This Quote (Logic Coming Soon)
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
