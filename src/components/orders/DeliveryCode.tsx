'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';

/** Shown to the customer while their delivery is on its way. */
export function CustomerDeliveryCode({ orderId }: { orderId: string }) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/orders/${orderId}/delivery-code`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCode(d?.code ?? null))
      .catch(() => {});
  }, [orderId]);
  if (!code) return null;
  return (
    <div className="mt-3 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-primary" /> Your delivery code
      </p>
      <p className="my-1 font-mono text-3xl font-bold tracking-[0.4em]">{code}</p>
      <p className="text-xs text-muted-foreground">
        Check your items first. Only give this code to the delivery agent once you&apos;re happy with them; giving it confirms delivery and pays the vendor.
      </p>
    </div>
  );
}

/** The delivery agent types the customer's code to complete the delivery. */
export function DeliveryCodeDialog({
  orderId,
  open,
  onOpenChange,
  onDelivered,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelivered: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delivered', deliveryCode: code, actingAs: 'agent' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? 'Could not confirm the delivery.');
        return;
      }
      onOpenChange(false);
      onDelivered();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Confirm delivery
          </DialogTitle>
          <DialogDescription>
            Let the customer check their items. When they&apos;re happy, ask for the 4-digit delivery code shown in their Closebuy app.
          </DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={submit} className="space-y-3">
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="0000"
            aria-label="Delivery code"
            className="text-center font-mono text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || code.length !== 4}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm delivery
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
