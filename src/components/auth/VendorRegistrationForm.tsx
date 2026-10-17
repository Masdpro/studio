
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { goToCheckEmail } from '@/components/auth/goToCheckEmail';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

const vendorStatusOptions = ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] as const;

const vendorRegistrationSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name must be at least 2 characters.' }),
  contactEmail: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().optional(),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
  streetAddress: z.string().min(5, { message: 'Street address must be at least 5 characters.' }),
  city: z.string().min(2, { message: 'City must be at least 2 characters.' }),
  country: z.string().min(2, { message: 'Country must be at least 2 characters.' }),
  imageUrl: z.string().optional(),
  externalStoreUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  operatingHours: z.string().min(5, { message: "Please provide operating hours (e.g., 9 AM - 5 PM, Mon-Fri)." }),
  status: z.enum(vendorStatusOptions, { required_error: "Please select a status." }),
});

type VendorRegistrationFormValues = z.infer<typeof vendorRegistrationSchema>;

export function VendorRegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { signUp, user, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const form = useForm<VendorRegistrationFormValues>({
    resolver: zodResolver(vendorRegistrationSchema),
    defaultValues: {
      businessName: '',
      contactEmail: '',
      password: '',
      phone: '',
      streetAddress: '',
      city: '',
      country: '',
      imageUrl: '',
      externalStoreUrl: '',
      operatingHours: '',
      status: 'Open',
    },
  });

  async function onSubmit(data: VendorRegistrationFormValues) {
    setError(null);
    if (!user && (!data.password || data.password.length < 8)) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const { password, contactEmail, ...vendorProfile } = data;
      if (user) {
        const res = await fetch('/api/vendor/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactEmail, ...vendorProfile }) });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save your profile.');
        await refresh();
        toast({ title: 'Profile created', description: 'Opening your verification page. The first load can take a few seconds.' });
        setRedirecting(true);
        router.push('/account/verification');
        return;
      }
      const { devLink } = await signUp(contactEmail, password ?? "", 'vendor', data.businessName, {
        phone: data.phone,
        profile: { contactEmail, ...vendorProfile },
      });
      toast({
        title: 'Registration Submitted!',
        description: 'Confirm your email, then upload your documents for review.',
      });
      goToCheckEmail(router, contactEmail, devLink);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Could not register', description: msg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <UserPlus className="h-6 w-6 text-primary" />
          Vendor Registration
        </CardTitle>
        <CardDescription>Join Closebuy as a vendor and start selling your products.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storefront photo (optional)</FormLabel>
              <FormControl>
                <ImageUploadField value={field.value ?? ''} onChange={field.onChange} endpoint="/api/vendor/upload" />
              </FormControl>
              <FormDescription>A photo of your shop front. You can also add or change it later from your profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
            {!user && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="08012345678" {...field} />
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
                        <SelectValue placeholder="Select your current status" />
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
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || redirecting}>
              {(isLoading || redirecting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
