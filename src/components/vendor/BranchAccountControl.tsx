'use client';

import { useState } from 'react';
import { KeyRound, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { VendorBranch } from '@/lib/types';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';

const LOGIN_RULES = { email: rules.email, password: rules.newPassword };
const PASSWORD_ONLY = { password: rules.newPassword };

/** Gives a branch its own login (orders, analytics and its own products), or resets / removes it. */
export function BranchAccountControl({ branch, onChanged }: { branch: VendorBranch; onChanged: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const checks = useFieldChecks<'email' | 'password'>(branch.accountEmail ? PASSWORD_ONLY : LOGIN_RULES);
  const url = `/api/vendor/branches/${branch.id}/account`;

  async function submit() {
    if (!checks.validateAll({ email, password })) return;
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Could not save the login.');
      toast({ title: d.reset ? 'Password changed' : 'Branch login created', description: d.reset ? undefined : 'Share the email and password with the branch manager.' });
      setOpen(false); setEmail(''); setPassword('');
      onChanged();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Not saved', description: e instanceof Error ? e.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function removeAccess() {
    if (!window.confirm(`Remove ${branch.name}'s login? They will no longer see the branch's orders.`)) return;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) { toast({ title: 'Branch login removed' }); onChanged(); }
  }

  return (
    <div className="mt-2 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {branch.accountEmail ? (
          <>
            <span className="flex items-center gap-1 text-muted-foreground"><KeyRound className="h-3 w-3" />Login: {branch.accountEmail}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>Reset password</Button>
            <Button type="button" variant="ghost" size="sm" onClick={removeAccess}>Remove login</Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}><UserPlus className="mr-1 h-3 w-3" />Create branch login</Button>
        )}
      </div>
      {open && (
        <>
        <div className="flex flex-wrap items-center gap-2">
          {!branch.accountEmail && <Input className="max-w-[14rem]" type="email" placeholder="Branch email" {...checks.field('email', email, (v: string) => setEmail(v))} />}
          <Input className="max-w-[14rem]" type="text" placeholder="Temporary password (8+ characters)" {...checks.field('password', password, (v: string) => setPassword(v))} />
          <Button type="button" size="sm" onClick={submit} disabled={busy || checks.hasErrors || !password || (!branch.accountEmail && !email)}>
            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save
          </Button>
        </div>
        <FieldError message={checks.error('email')} />
        <FieldError message={checks.error('password')} />
        </>
      )}
    </div>
  );
}
