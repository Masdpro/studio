'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { rules } from '@/lib/field-rules';
import { zRule } from '@/lib/form-rules';

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EmailCodeVerification } from '@/components/auth/CheckEmail';
import { Turnstile, useTurnstile } from '@/components/auth/Turnstile';

const customerRegistrationSchema = z
  .object({
    displayName: zRule(rules.personName),
    email: zRule(rules.email),
    password: zRule(rules.newPassword),
    confirmPassword: z.string().min(1, { message: 'Type the password again.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

type CustomerRegistrationFormValues = z.infer<typeof customerRegistrationSchema>;

export function CustomerRegistrationForm() {
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [pending, setPending] = useState<{ email: string; password: string; devCode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const captcha = useTurnstile();

  const form = useForm<CustomerRegistrationFormValues>({
    resolver: zodResolver(customerRegistrationSchema),
    // Check each entry as soon as the person leaves it, then again as they correct it.
    mode: 'onTouched',
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(data: CustomerRegistrationFormValues) {
    setError(null);
    setIsLoading(true);
    try {
      const { devCode } = await signUp(data.email, data.password, 'customer', data.displayName, { turnstileToken: captcha.token });
      setPending({ email: data.email, password: data.password, devCode });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      captcha.reset();
      setIsLoading(false);
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
            router.push('/shop');
            router.refresh();
          } catch {
            router.push('/auth/login?verified=1');
          }
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <UserPlus className="h-6 w-6 text-primary" />
          Create Your Account
        </CardTitle>
        <CardDescription>Sign up to start shopping on Closebuy.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ada Obi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Turnstile key={captcha.widgetKey} {...captcha.widgetProps} />
            <Button type="submit" className="w-full" disabled={isLoading || captcha.waiting}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary underline ml-1">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
