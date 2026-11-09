'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Turnstile, useTurnstile } from '@/components/auth/Turnstile';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captcha = useTurnstile();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, turnstileToken: captcha.token }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      setDevLink(data.devLink ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      captcha.reset();
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><KeyRound className="h-6 w-6 text-primary" />Forgot password</CardTitle>
          <CardDescription>Enter your account email and we&apos;ll send you a link to choose a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert>
              <MailCheck className="h-4 w-4" />
              <AlertDescription>
                If <span className="font-medium">{email}</span> has a Closebuy account, a reset link is on its way. It works for one hour. Check your spam folder if you don&apos;t see it.
                {devLink && (
                  <span className="mt-2 block break-all text-xs">Development only: <a className="underline" href={devLink}>open reset link</a></span>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <form method="post" onSubmit={submit} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Turnstile key={captcha.widgetKey} {...captcha.widgetProps} />
              <Button type="submit" className="w-full" disabled={busy || !email || captcha.waiting}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send reset link
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary underline">Back to sign in</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
