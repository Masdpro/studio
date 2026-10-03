'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Loader2, FlaskConical } from 'lucide-react';

const DEV_LINK_KEY = 'closebuyDevVerifyLink';

export function CheckEmail() {
  const email = useSearchParams().get('email') ?? '';
  const [devLink, setDevLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setDevLink(sessionStorage.getItem(DEV_LINK_KEY));
    } catch {}
  }, []);

  async function resend() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.devLink) {
        setDevLink(data.devLink);
        try {
          sessionStorage.setItem(DEV_LINK_KEY, data.devLink);
        } catch {}
      }
      setMessage('If that address needs confirming, a new link is on its way. You can ask again after a minute.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Mail className="h-6 w-6 text-primary" />
          Check your email
        </CardTitle>
        <CardDescription>
          We sent a confirmation link to <span className="font-medium text-foreground">{email || 'your email address'}</span>. Open it to activate your account, then sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {devLink && (
          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Development mode</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>No real emails are sent yet, so use this link (it is also printed in the server terminal):</p>
              <Button asChild size="sm" className="w-full">
                <a href={devLink}>Confirm my email</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button variant="outline" className="w-full" onClick={resend} disabled={busy || !email}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send the link again
        </Button>
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
