'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Loader2, FlaskConical, AlertCircle } from 'lucide-react';

const DEV_CODE_KEY = 'closebuyDevVerifyCode';

/** The standalone /auth/check-email page: email comes from the URL, and success leads to sign-in. */
export function CheckEmail() {
  const initialEmail = useSearchParams().get('email') ?? '';
  return <EmailCodeVerification initialEmail={initialEmail} />;
}

type Props = {
  initialEmail: string;
  /** Called after the code is accepted. Without it, the user is sent to the sign-in page. */
  onVerified?: () => Promise<void> | void;
  /** Dev-only code returned by sign-up, shown on screen when real emails aren't sent. */
  devCode?: string;
};

export function EmailCodeVerification({ initialEmail, onVerified, devCode: devCodeProp }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (devCodeProp) {
      setDevCode(devCodeProp);
      return;
    }
    try {
      setDevCode(sessionStorage.getItem(DEV_CODE_KEY));
    } catch {}
  }, [devCodeProp]);

  async function resend() {
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.devCode) {
        setDevCode(data.devCode);
        try {
          sessionStorage.setItem(DEV_CODE_KEY, data.devCode);
        } catch {}
      }
      setMessage('If that address needs confirming, a new code is on its way. You can ask again after a minute.');
    } finally {
      setSending(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'That code did not work. Try again.');
        setChecking(false);
        return;
      }
      try {
        sessionStorage.removeItem(DEV_CODE_KEY);
      } catch {}
      if (onVerified) {
        setMessage('Email confirmed. Signing you in…');
        await onVerified();
        return; // keep the button busy while the next page loads
      }
      router.push('/auth/login?verified=1');
      return;
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setChecking(false);
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Mail className="h-6 w-6 text-primary" />
          Confirm your email
        </CardTitle>
        <CardDescription>
          {initialEmail ? (
            <>
              We sent a 6-digit code to <span className="font-medium text-foreground">{initialEmail}</span>. Enter it below to activate your account.
            </>
          ) : (
            'Enter your email address and the 6-digit code we sent you.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {devCode && (
          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Development mode</AlertTitle>
            <AlertDescription>
              No real emails are sent yet. Your code is <span className="font-mono font-semibold">{devCode}</span> (it is also printed in the server terminal).
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form method="post" onSubmit={verify} className="space-y-4">
          {!initialEmail && (
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input id="verify-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="verify-code">Confirmation code</Label>
            <Input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              placeholder="123456"
              autoFocus
              className="text-center font-mono text-2xl tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={checking || !email || code.length !== 6}>
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm email
          </Button>
        </form>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button variant="outline" className="w-full" onClick={resend} disabled={sending || !email}>
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send me a new code
        </Button>
        <p className="text-xs text-muted-foreground">Can&apos;t find it? Check your spam or promotions folder. The code expires after 30 minutes.</p>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Already confirmed?{' '}
        <Link href="/auth/login" className="text-primary underline ml-1">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
