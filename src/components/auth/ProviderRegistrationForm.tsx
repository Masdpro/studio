'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { AlertCircle, CalendarCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Turnstile, useTurnstile } from '@/components/auth/Turnstile';
import { EmailCodeVerification } from '@/components/auth/CheckEmail';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { BusinessKindPicker } from '@/components/auth/BusinessKindPicker';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';

const schema = z.object({
  businessName: z.string().min(2, { message: 'Enter your business name.' }),
  category: z.string().min(1, { message: 'Choose what kind of service you offer.' }),
  tagline: z.string().max(120).optional(),
  contactEmail: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().optional(),
  phone: z.string().min(10, { message: 'Enter your mobile number, e.g. 08012345678.' }),
  streetAddress: z.string().min(5, { message: 'Enter your business address.' }),
  area: z.string().min(2, { message: 'Enter your area, e.g. Lekki Phase 1.' }),
  city: z.string().min(2, { message: 'Enter your city.' }),
  imageUrl: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/** Sign-up for a service business (booked by customers). Separate from a product store. */
export function ProviderRegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { signUp, signIn, user, refresh } = useAuth();
  const [pending, setPending] = useState<{ email: string; password: string; devCode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const captcha = useTurnstile();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { businessName: '', category: '', tagline: '', contactEmail: user?.email ?? '', password: '', phone: '', streetAddress: '', area: '', city: 'Lagos', imageUrl: '' },
  });

  const toVerification = () => router.push('/account/verification');

  async function onSubmit(data: Values) {
    setError(null);
    if (!user && (!data.password || data.password.length < 8)) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    const { password, ...profile } = data;
    try {
      if (user) {
        const res = await fetch('/api/provider/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save your business.');
        await refresh();
        toast({ title: 'Service business added', description: 'Next, verify it so customers can book you.' });
        toVerification();
        return;
      }
      const { devCode, emailVerified, addedToExisting } = await signUp(data.contactEmail, password ?? '', 'provider', data.businessName, {
        phone: data.phone,
        turnstileToken: captcha.token,
        profile,
      });
      if (emailVerified) {
        toast({ title: 'Added to your Closebuy account', description: 'Opening your verification page.' });
        try {
          await signIn(data.contactEmail, password ?? '');
          toVerification();
          router.refresh();
        } catch {
          router.push('/auth/login?callbackUrl=%2Faccount%2Fverification');
        }
        return;
      }
      toast({ title: addedToExisting ? 'Added to your Closebuy account' : 'Almost there', description: 'Enter the code we emailed you to continue.' });
      setPending({ email: data.contactEmail, password: password ?? '', devCode });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      captcha.reset();
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <EmailCodeVerification
        initialEmail={pending.email}
        devCode={pending.devCode}
        onVerified={async () => {
          try {
            await signIn(pending.email, pending.password);
            toVerification();
            router.refresh();
          } catch {
            router.push('/auth/login?verified=1');
          }
        }}
      />
    );
  }

  const text = (name: keyof Values, label: string, placeholder: string, extra?: { type?: string; description?: string; autoComplete?: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={extra?.type ?? 'text'} placeholder={placeholder} autoComplete={extra?.autoComplete} {...field} value={field.value ?? ''} />
          </FormControl>
          {extra?.description && <FormDescription>{extra.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <CalendarCheck className="h-6 w-6 text-primary" />
          Register your service business
        </CardTitle>
        <CardDescription>Get booked by customers near you. You set your services, prices and hours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BusinessKindPicker active="services" />
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {/reset your password/.test(error) && (
                <>
                  {' '}
                  <Link href="/auth/forgot-password" className="font-medium underline">Reset password</Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business photo or logo (optional)</FormLabel>
                  <FormControl>
                    <ImageUploadField value={field.value ?? ''} onChange={field.onChange} endpoint="/api/provider/upload" />
                  </FormControl>
                  <FormDescription>You can add photos of your past work for each service after you sign up.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {text('businessName', 'Business name', 'e.g. Glow Lab Studio')}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What kind of service?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {text('tagline', 'Short description (optional)', 'e.g. Braids, silk press & bridal glam')}
            {text('contactEmail', 'Email', 'you@example.com', { type: 'email' })}
            {!user && text('password', 'Password', 'At least 8 characters', { type: 'password', autoComplete: 'current-password', description: 'Already on Closebuy (as a shopper or store owner)? Use the same email and password and we’ll add this business to that login.' })}
            {text('phone', 'Mobile number', '08012345678', { type: 'tel' })}
            {text('streetAddress', 'Business address', 'Where you work, or where you’re based if you go to customers')}
            <div className="grid gap-4 sm:grid-cols-2">
              {text('area', 'Area', 'e.g. Lekki Phase 1')}
              {text('city', 'City', 'Lagos')}
            </div>
            <p className="text-xs text-muted-foreground">
              Next you’ll verify your phone, upload a government ID and take a live selfie. Customers often let service providers into their homes, so we check everyone first.
            </p>
            {!user && <Turnstile key={captcha.widgetKey} {...captcha.widgetProps} />}
            <Button type="submit" className="w-full" disabled={busy || (!user && captcha.waiting)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register business
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
