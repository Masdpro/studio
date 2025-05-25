
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const vendorStatusOptions = ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] as const;

const vendorProfileSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name must be at least 2 characters.' }),
  contactEmail: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
  streetAddress: z.string().min(5, { message: 'Street address must be at least 5 characters.' }),
  city: z.string().min(2, { message: 'City must be at least 2 characters.' }),
  country: z.string().min(2, { message: 'Country must be at least 2 characters.' }),
  bio: z.string().optional(),
  externalStoreUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  operatingHours: z.string().min(5, { message: "Please provide operating hours (e.g., 9 AM - 5 PM, Mon-Fri)." }).optional(),
  status: z.enum(vendorStatusOptions).optional(),
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
      streetAddress: vendor?.streetAddress || '',
      city: vendor?.city || '',
      country: vendor?.country || '',
      bio: '', // Assuming bio is not part of initial Vendor type for simplicity
      externalStoreUrl: vendor?.externalStoreUrl || '',
      operatingHours: vendor?.operatingHours || '',
      status: vendor?.status || 'Open',
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
          name="streetAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="Your City" {...field} />
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
                <Input placeholder="Your Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="operatingHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operating Hours</FormLabel>
              <FormControl>
                <Input placeholder="E.g., 9 AM - 5 PM, Mon-Fri" {...field} />
              </FormControl>
               <FormDescription>
                    Let customers know when you are open.
                  </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select current status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vendorStatusOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <FormField
          control={form.control}
          name="externalStoreUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External Store URL (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://yourstore.com" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Link to your existing online store. This will be displayed to customers.
              </FormDescription>
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
