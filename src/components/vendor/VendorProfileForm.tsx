'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import type { Vendor } from '@/lib/types';

const vendorProfileSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name must be at least 2 characters.' }),
  contactEmail: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
  bio: z.string().optional(),
});

type VendorProfileFormValues = z.infer<typeof vendorProfileSchema>;

interface VendorProfileFormProps {
  vendor?: Vendor; // Optional initial vendor data
}

export function VendorProfileForm({ vendor }: VendorProfileFormProps) {
  const { toast } = useToast();
  const form = useForm<VendorProfileFormValues>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      businessName: vendor?.businessName || '',
      contactEmail: vendor?.contactEmail || '',
      phone: vendor?.phone || '',
      address: vendor?.address || '',
      bio: '', // Assuming bio is not part of initial Vendor type for simplicity
    },
  });

  function onSubmit(data: VendorProfileFormValues) {
    console.log('Vendor profile data:', data);
    // Placeholder for actual profile update logic
    toast({
      title: 'Profile Updated!',
      description: 'Your vendor profile has been successfully updated.',
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Business Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@example.com" {...field} />
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
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="123-456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Bio (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us a little about your business" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
