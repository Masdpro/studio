
// src/components/errands/SubmitQuoteDialog.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { rules } from '@/lib/field-rules';
import { zRule } from '@/lib/form-rules';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { DollarSign, MessageSquare, Send } from 'lucide-react';

const quoteSchema = z.object({
  estimatedItemCost: z.coerce.number({ invalid_type_error: 'Enter the cost of the items as a number, e.g. 5000.' }).min(1, { message: 'Enter the cost of the items.' }).max(10_000_000, { message: 'The item cost can’t be more than ₦10,000,000.' }),
  deliveryFee: z.coerce.number({ invalid_type_error: 'Enter your delivery fee as a number, e.g. 1500.' }).min(0, { message: 'The delivery fee can’t be negative.' }).max(100_000, { message: 'The delivery fee can’t be more than ₦100,000.' }),
  agentNotes: z.string().max(300, { message: 'Notes cannot exceed 300 characters.' }).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface SubmitQuoteDialogProps {
  errand: ErrandRequest | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitQuote: (quoteData: Omit<ErrandQuote, 'id' | 'errandRequestId' | 'agentId' | 'totalEstimatedCost' | 'status' | 'createdAt'>) => void;
}

export function SubmitQuoteDialog({ errand, isOpen, onOpenChange, onSubmitQuote }: SubmitQuoteDialogProps) {
  const { toast } = useToast();
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    // Check each entry as soon as the person leaves it.
    mode: 'onTouched',
    defaultValues: {
      estimatedItemCost: 0,
      deliveryFee: 0,
      agentNotes: '',
    },
  });

  if (!errand) return null;

  function handleSubmit(data: QuoteFormValues) {
    onSubmitQuote(data);
    toast({
      title: 'Quote Submitted!',
      description: `Your quote for errand ${errand?.id.substring(0,8)} has been submitted.`,
    });
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" />
            Submit Quote for Errand
          </DialogTitle>
          <DialogDescription>
            Provide your cost estimates for completing errand: <span className="font-semibold">{errand.id.substring(0,8)}...</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <h4 className="font-medium text-sm mb-1">Items Requested:</h4>
            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-line max-h-32 overflow-y-auto">{errand.itemsDescription}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="estimatedItemCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" /> Estimated Item(s) Cost
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                     <DollarSign className="h-4 w-4 text-muted-foreground" /> Your Delivery Fee
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" /> Notes for Customer (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="E.g., I can get this done by 5 PM." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Submit Quote
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
