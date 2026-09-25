'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Market } from '@/lib/types';

const marketSchema = z.object({
  name: z.string().min(2, { message: 'Market name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  locationTag: z.string().min(2, { message: 'A location (e.g. Lagos Island) is required.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  aiHint: z.string().optional(),
  isTrending: z.boolean(),
});

type MarketFormValues = z.infer<typeof marketSchema>;

interface MarketFormDialogProps {
  market: Market | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function marketToFormValues(market: Market | null): MarketFormValues {
  return {
    name: market?.name ?? '',
    description: market?.description ?? '',
    locationTag: market?.locationTag ?? '',
    imageUrl: market?.imageUrl ?? '',
    aiHint: market?.aiHint ?? '',
    isTrending: market?.isTrending ?? false,
  };
}

export function MarketFormDialog({ market, open, onOpenChange, onSaved }: MarketFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<MarketFormValues>({
    resolver: zodResolver(marketSchema),
    defaultValues: marketToFormValues(market),
  });

  useEffect(() => {
    form.reset(marketToFormValues(market));
  }, [market, form]);

  async function onSubmit(data: MarketFormValues) {
    setIsSaving(true);
    try {
      const url = market ? `/api/admin/markets/${market.id}` : '/api/admin/markets';
      const res = await fetch(url, {
        method: market ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save market.' }));
        throw new Error(error ?? 'Failed to save market.');
      }
      toast({ title: market ? 'Market updated!' : 'Market created!', description: `${data.name} has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{market ? 'Edit Market' : 'New Market'}</DialogTitle>
          <DialogDescription>
            {market ? `Update the details for ${market.name}.` : 'Add a new local market.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <div className="flex-1 min-h-0 overflow-y-auto -mr-6 pr-6">
              <div className="space-y-4 py-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Mile 12 International Market" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What's this market known for?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Lagos Mainland" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aiHint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Hint (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., lagos market" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isTrending"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <FormLabel className="!mt-0">Show in Trending Markets</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
