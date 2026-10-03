'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, Circle, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { VerificationState } from '@/components/account/AccountVerification';

type Account = VerificationState & { id: string; name: string; createdAt: string };

const Check = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className="inline-flex items-center gap-1 text-sm">
    {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
    {label}
  </span>
);

export default function AdminVerificationsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verifications');
      if (res.ok) setAccounts((await res.json()).accounts);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast({ variant: 'destructive', title: 'Not saved', description: data.error ?? 'Something went wrong.' });
      else {
        toast({ title: action === 'approve' ? 'Account approved' : 'Sent back for changes' });
        setRejecting(null);
        setNote('');
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  const pending = accounts.filter((a) => a.approvalStatus === 'pending');
  const others = accounts.filter((a) => a.approvalStatus !== 'pending');

  const renderCard = (a: Account) => (
    <Card key={a.id}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{a.name}</CardTitle>
            <CardDescription>
              {a.role === 'vendor' ? 'Vendor' : 'Delivery agent'} · {a.email}
              {a.phone ? ` · ${a.phone}` : ''}
            </CardDescription>
          </div>
          <Badge variant={a.approvalStatus === 'approved' ? 'default' : a.approvalStatus === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
            {a.approvalStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Check ok={a.emailVerified} label="Email" />
          <Check ok={a.phoneVerified} label="Phone" />
          <Check ok={a.documentsComplete} label="Documents" />
        </div>
        <div className="flex flex-wrap gap-2">
          {a.requiredDocuments.map((d) =>
            d.uploaded && d.id ? (
              <Button key={d.kind} variant="outline" size="sm" asChild>
                <a href={`/api/account/documents/${d.id}`} target="_blank" rel="noreferrer">
                  <FileText className="mr-1.5 h-4 w-4" />
                  {d.kind.replace('_', ' ')}
                </a>
              </Button>
            ) : (
              <Badge key={d.kind} variant="outline" className="text-muted-foreground">
                {d.kind.replace('_', ' ')}: missing
              </Badge>
            ),
          )}
        </div>
        {a.approvalNote && <p className="text-sm text-destructive">Sent back: {a.approvalNote}</p>}
        {rejecting === a.id ? (
          <div className="space-y-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should they fix? (they will see this)" />
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" disabled={busy === a.id} onClick={() => decide(a.id, 'reject')}>
                Send back
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {a.approvalStatus !== 'approved' && (
              <Button size="sm" disabled={busy === a.id || !a.readyForReview} onClick={() => decide(a.id, 'approve')}>
                {busy === a.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve
              </Button>
            )}
            {a.approvalStatus !== 'rejected' && (
              <Button variant="outline" size="sm" onClick={() => { setRejecting(a.id); setNote(''); }}>
                {a.approvalStatus === 'approved' ? 'Revoke' : 'Send back'}
              </Button>
            )}
          </div>
        )}
        {a.approvalStatus !== 'approved' && !a.readyForReview && <p className="text-xs text-muted-foreground">Approve unlocks once email, phone and every document are done.</p>}
      </CardContent>
    </Card>
  );

  return (
    <AdminGate>
      <div className="container mx-auto max-w-4xl py-6 space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" /> Admin
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Verifications</h1>
          <p className="text-muted-foreground">Review documents from new vendors and delivery agents before they can trade.</p>
        </div>
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Waiting for review ({pending.length})</h2>
              {pending.length === 0 ? <p className="text-muted-foreground">Nothing waiting.</p> : pending.map(renderCard)}
            </section>
            {others.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Decided</h2>
                {others.map(renderCard)}
              </section>
            )}
          </>
        )}
      </div>
    </AdminGate>
  );
}
