'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Wallet, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/context/CartContext';
import { rememberAddress } from '@/lib/delivery-address';
import { clearPendingOrder, readPendingOrder } from '@/lib/pending-order';

type Stage =
  | { kind: 'checking' }
  | { kind: 'placing' }
  | { kind: 'done' }
  | { kind: 'unpaid'; message: string }
  | { kind: 'slow' }
  /** Paid, but the order couldn't be placed: the money is safe in the wallet. */
  | { kind: 'paidNoOrder'; amount: number; message: string };

const POLL_MS = 3000;
const MAX_TRIES = 60; // about 3 minutes: Paystack can take a while to confirm a transfer

/**
 * Where Paystack sends the shopper after "Pay online" at checkout. It waits for Paystack to confirm
 * the payment (which credits the wallet), then places the saved order from the wallet.
 */
function PaidInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { clear } = useCart();
  const reference = params.get('reference') ?? params.get('trxref');
  const [stage, setStage] = useState<Stage>({ kind: 'checking' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!reference) {
      setStage({ kind: 'unpaid', message: 'We could not find this payment.' });
      return;
    }
    // Paystack's own "Cancel payment" link lands here with ?cancelled=1.
    if (params.get('cancelled')) {
      clearPendingOrder();
      setStage({ kind: 'unpaid', message: 'You cancelled the payment.' });
      return;
    }
    let tries = 0;
    let stop = false;

    const placeOrder = async (amount: number) => {
      const pending = readPendingOrder();
      if (!pending || pending.reference !== reference) {
        // Paid, but this browser no longer has the order (e.g. opened on another device): the money is in the wallet.
        window.dispatchEvent(new Event('wallet:updated'));
        setStage({ kind: 'paidNoOrder', amount, message: 'Your payment went through, but we could not find the order it was for.' });
        return;
      }
      // Guard against placing the same order twice if this page is refreshed mid-way.
      const lock = `closebuy-placing-${reference}`;
      try {
        if (sessionStorage.getItem(lock)) return;
        sessionStorage.setItem(lock, '1');
      } catch { /* storage unavailable */ }
      setStage({ kind: 'placing' });
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending.body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? 'The order could not be placed.');
        clearPendingOrder();
        if (pending.deliveryAddress) rememberAddress({ address: pending.deliveryAddress });
        clear();
        window.dispatchEvent(new Event('wallet:updated'));
        window.dispatchEvent(new Event('notifications:updated'));
        setStage({ kind: 'done' });
        setTimeout(() => router.replace('/orders'), 1500);
      } catch (err) {
        clearPendingOrder();
        window.dispatchEvent(new Event('wallet:updated'));
        setStage({ kind: 'paidNoOrder', amount, message: err instanceof Error ? err.message : 'The order could not be placed.' });
      }
    };

    const check = async () => {
      if (stop) return;
      tries += 1;
      try {
        const res = await fetch(`/api/payments/wallet/verify?reference=${encodeURIComponent(reference)}`);
        const data = res.ok ? await res.json() : null;
        if (data?.success) {
          stop = true;
          await placeOrder(Number(data.amount) || 0);
          return;
        }
        if (data && !data.pending) {
          stop = true;
          clearPendingOrder();
          setStage({ kind: 'unpaid', message: data.error ?? 'Your payment was not completed.' });
          return;
        }
      } catch {
        // A network blip: try again on the next tick.
      }
      if (tries >= MAX_TRIES) {
        stop = true;
        setStage({ kind: 'slow' });
        return;
      }
      setTimeout(check, POLL_MS);
    };
    check();
    return () => { stop = true; };
  }, [reference, clear, router, params]);

  return (
    <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <Card className="w-full rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          {(stage.kind === 'checking' || stage.kind === 'placing') && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold">{stage.kind === 'checking' ? 'Confirming your payment…' : 'Placing your order…'}</h1>
              <p className="text-sm text-muted-foreground">Please keep this page open. This can take up to a minute for bank transfers.</p>
            </>
          )}
          {stage.kind === 'done' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h1 className="text-xl font-bold">Order placed!</h1>
              <p className="text-sm text-muted-foreground">Payment received. Taking you to your orders…</p>
              <Button asChild className="mt-2"><Link href="/orders">View my orders</Link></Button>
            </>
          )}
          {stage.kind === 'unpaid' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-xl font-bold">Payment not completed</h1>
              <p className="text-sm text-muted-foreground">{stage.message} You have not been charged, and your cart is still saved.</p>
              <Button asChild className="mt-2"><Link href="/shop">Back to the shop</Link></Button>
            </>
          )}
          {stage.kind === 'slow' && (
            <>
              <Loader2 className="h-12 w-12 text-muted-foreground" />
              <h1 className="text-xl font-bold">Still waiting for your bank</h1>
              <p className="text-sm text-muted-foreground">
                We haven&apos;t heard back from Paystack yet. If you were charged, the money will appear in your wallet shortly and you can pay for this order from there. Your cart is still saved.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>Check again</Button>
                <Button asChild><Link href="/shop">Back to the shop</Link></Button>
              </div>
            </>
          )}
          {stage.kind === 'paidNoOrder' && (
            <>
              <Wallet className="h-12 w-12 text-primary" />
              <h1 className="text-xl font-bold">Your money is safe in your wallet</h1>
              <p className="text-sm text-muted-foreground">
                We received your payment{stage.amount ? ` of ₦${stage.amount.toLocaleString()}` : ''}, but the order couldn&apos;t be placed: {stage.message} The money is in your Closebuy wallet: you can use it to order again, or withdraw it.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" asChild><Link href="/wallet">View wallet</Link></Button>
                <Button asChild><Link href="/shop">Back to the shop</Link></Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPaidPage() {
  return (
    <Suspense fallback={null}>
      <PaidInner />
    </Suspense>
  );
}
