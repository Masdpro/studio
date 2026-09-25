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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Market, Vendor } from '@/lib/types';

const NO_MARKET_VALUE = '__none__';

const vendorSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name must be at least 2 characters.' }),
  contactEmail: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(5, { message: 'Please enter a valid phone number.' }),
  streetAddress: z.string().min(2, { message: 'Street address is required.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  country: z.string().min(2, { message: 'Country is required.' }),
  locationTag: z.string().optional(),
  marketId: z.string(),
  operatingHours: z.string().optional(),
  status: z.enum(['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable']),
  externalStoreUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormDialogProps {
  vendor: Vendor | null;
  markets: Market[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function vendorToFormValues(vendor: Vendor | null): VendorFormValues {
  return {
    businessName: vendor?.businessName ?? '',
    contactEmail: vendor?.contactEmail ?? '',
    phone: vendor?.phone ?? '',
    streetAddress: vendor?.streetAddress ?? '',
    city: vendor?.city ?? '',
    country: vendor?.country ?? 'Nigeria',
    locationTag: vendor?.locationTag ?? '',
    marketId: vendor?.marketId ?? NO_MARKET_VALUE,
    operatingHours: vendor?.operatingHours ?? '',
    status: vendor?.status ?? 'Open',
    externalStoreUrl: vendor?.externalStoreUrl ?? '',
  };
}

export function VendorFormDialog({ vendor, markets, open, onOpenChange, onSaved }: VendorFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorToFormValues(vendor),
  });

  useEffect(() => {
    form.reset(vendorToFormValues(vendor));
  }, [vendor, form]);

  async function onSubmit(data: VendorFormValues) {
    setIsSaving(true);
    try {
      const payload = { ...data, marketId: data.marketId === NO_MARKET_VALUE ? null : data.marketId };
      const url = vendor ? `/api/admin/vendors/${vendor.id}` : '/api/admin/vendors';
      const res = await fetch(url, {
        method: vendor ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save vendor.' }));
        throw new Error(error ?? 'Failed to save vendor.');
      }
      toast({ title: vendor ? 'Vendor updated!' : 'Vendor created!', description: `${data.businessName} has been saved.` });
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
          <DialogTitle>{vendor ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor ? `Update the details for ${vendor.businessName}.` : 'Add a new vendor stall.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <div className="flex-1 min-h-0 overflow-y-auto -mr-6 pr-6">
              <div className="space-y-4 py-1">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Balogun Fabrics Hub" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="sales@vendor.ng" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="08012345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Balogun Market, Idumota" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Lagos Island, Lagos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Nigeria" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="locationTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Tag (for city/area filter)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Lagos Island" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market (which local market this stall is inside)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a market" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_MARKET_VALUE}>Not in a market</SelectItem>
                          {markets.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="operatingHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operating Hours (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., 9 AM - 6 PM, Mon-Sat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Opening Soon">Opening Soon</SelectItem>
                          <SelectItem value="Temporarily Unavailable">Temporarily Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalStoreUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External Store URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
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
