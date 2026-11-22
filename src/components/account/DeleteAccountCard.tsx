'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';
import { InfoTip } from '@/components/ui/info-tip';

const DELETE_RULES = { confirmText: (v: string) => (v.trim().toUpperCase() === 'DELETE' ? null : 'Type DELETE to confirm.'), password: (v: string) => (v ? null : 'Enter your password.') };

/**
 * "Delete my account" on the profile page. The app stores require people to be able to do this
 * themselves. It first shows anything that has to be finished (orders, bookings, money in the wallet),
 * then asks for the password before deleting.
 */
export function DeleteAccountCard({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = useFieldChecks<'confirmText' | 'password'>(DELETE_RULES);

  const start = async () => {
    setOpen(true); setBlockers(null); setPassword(''); setConfirmText(''); setError(null);
    const res = await fetch('/api/account/delete', { cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    setBlockers(res.ok ? d.blockers ?? [] : [d.error ?? 'Could not check your account. Try again.']);
  };

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.reasons?.length) setBlockers(d.reasons);
        throw new Error(d.error ?? 'Could not delete your account. Try again.');
      }
      setOpen(false);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base">Delete account<InfoTip>Permanently remove your Closebuy account and your personal details.</InfoTip></CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={start}>
          <Trash2 className="mr-2 h-4 w-4" />Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete your account?</DialogTitle>
            <DialogDescription>This can’t be undone.</DialogDescription>
          </DialogHeader>

          {blockers === null ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : blockers.length ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">First, please finish these:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Your name, email, phone, addresses, bank details and ID documents are deleted.</li>
                <li>Your store, service business or delivery profile is removed from Closebuy.</li>
                <li>Records of past orders, bookings and payments are kept without your personal details, as the law and the other side of each order require.</li>
                <li>You’ll be signed out everywhere and can’t sign in to this account again.</li>
              </ul>
              <div className="space-y-2">
                <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
                <Input id="del-confirm" autoComplete="off" {...checks.field('confirmText', confirmText, setConfirmText)} />
                <FieldError message={checks.error('confirmText')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="del-pass">Your password</Label>
                <Input id="del-pass" type="password" autoComplete="current-password" {...checks.field('password', password, setPassword)} />
                <FieldError message={checks.error('password')} />
              </div>
              {error && <p className="text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Keep my account</Button>
            {blockers && !blockers.length && (
              <Button variant="destructive" onClick={remove} disabled={busy || !password || confirmText.trim().toUpperCase() !== 'DELETE'}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete permanently
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
