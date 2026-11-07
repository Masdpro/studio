'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const uid = params.get('uid') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, token, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      router.push('/auth/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!token || !uid) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This reset link is incomplete. <Link href="/auth/forgot-password" className="underline font-medium">Request a new one</Link>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error} <Link href="/auth/forgot-password" className="underline font-medium">Request a new link</Link>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="rp-new">New password</Label>
        <Input id="rp-new" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rp-confirm">Confirm new password</Label>
        <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {mismatch && <p className="text-sm text-destructive">The passwords don&apos;t match.</p>}
      </div>
      <Button type="submit" className="w-full" disabled={busy || password.length < 8 || password !== confirm}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Set new password
      </Button>
    </form>
  );
}

function ResetHeading({ invite }: { invite: boolean }) {
  return invite ? (
    <>
      <CardTitle className="flex items-center gap-2 text-2xl"><KeyRound className="h-6 w-6 text-primary" />Welcome to the Closebuy team</CardTitle>
      <CardDescription>You&apos;ve been added as an admin. Choose a password, then sign in with your work email.</CardDescription>
    </>
  ) : (
    <>
      <CardTitle className="flex items-center gap-2 text-2xl"><KeyRound className="h-6 w-6 text-primary" />Choose a new password</CardTitle>
      <CardDescription>After this, you&apos;ll be signed out on every device and can sign in with the new password.</CardDescription>
    </>
  );
}

function ResetHeadingFromLink() {
  return <ResetHeading invite={useSearchParams().get('invite') === '1'} />;
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <Suspense fallback={<ResetHeading invite={false} />}>
            <ResetHeadingFromLink />
          </Suspense>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ResetForm />
          </Suspense>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary underline">Back to sign in</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
