'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type VerifyState = { status: 'checking' } | { status: 'success'; newBalance: number } | { status: 'failed'; error: string };

export default function WalletCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const [state, setState] = useState<VerifyState>({ status: 'checking' });

  useEffect(() => {
    if (!reference) {
      setState({ status: 'failed', error: 'No payment reference was provided.' });
      return;
    }
    fetch(`/api/payments/wallet/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to verify payment.');
        if (data.success) {
          setState({ status: 'success', newBalance: data.newBalance });
        } else {
          setState({ status: 'failed', error: data.error ?? 'Payment was not successful.' });
        }
      })
      .catch((err) => setState({ status: 'failed', error: err instanceof Error ? err.message : 'Failed to verify payment.' }));
  }, [reference]);

  return (
    <div className="container mx-auto py-16 flex justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-3">
            {state.status === 'checking' && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {state.status === 'success' && <CheckCircle className="h-10 w-10 text-green-600" />}
            {state.status === 'failed' && <XCircle className="h-10 w-10 text-destructive" />}
            <span>
              {state.status === 'checking' && 'Confirming your payment...'}
              {state.status === 'success' && 'Wallet Funded!'}
              {state.status === 'failed' && 'Payment Not Completed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === 'success' && (
            <p className="text-muted-foreground">
              Your new wallet balance is <span className="font-semibold text-foreground">₦{state.newBalance.toLocaleString()}</span>.
            </p>
          )}
          {state.status === 'failed' && <p className="text-muted-foreground">{state.error}</p>}
          <Button asChild className="w-full">
            <Link href="/">Back to Closebuy</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
