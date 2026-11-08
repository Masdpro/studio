'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2, ShieldCheck, FlaskConical, FileText, Upload, Clock, XCircle, ScanFace } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LiveSelfieCheck } from '@/components/account/LiveSelfieCheck';

type Doc = { kind: string; label: string; uploaded: boolean; id: string | null; live?: boolean };
export type RoleVerification = {
  role: 'vendor' | 'delivery_agent';
  label: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNote: string | null;
  requiredDocuments: Doc[];
  documentsComplete: boolean;
  readyForReview: boolean;
  mayTrade: boolean;
};

export type VerificationState = {
  role: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  phoneRequired: boolean;
  needsReview: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNote: string | null;
  requiredDocuments: Doc[];
  /** Each trading role has its own documents and its own admin approval. */
  tradingRoles: RoleVerification[];
  fullyApproved?: boolean;
  documentsComplete: boolean;
  readyForReview: boolean;
  mayTrade: boolean;
};

const Step = ({ done, title, children }: { done: boolean; title: string; children?: React.ReactNode }) => (
  <div className="flex gap-3">
    {done ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="font-medium">{title}</p>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  </div>
);

/** `focus`: show this role's documents and review first (used on that role's dashboard). */
export function AccountVerification({ focus }: { focus?: 'vendor' | 'delivery_agent' } = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<VerificationState | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/account/verification');
    if (res.ok) {
      const { state } = await res.json();
      setState(state);
      setPhone((p) => p || state.phone || '');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function phoneAction(body: Record<string, string>) {
    setBusy(body.action);
    try {
      const res = await fetch('/api/account/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Could not continue', description: data.error ?? 'Something went wrong.' });
        return;
      }
      if (body.action === 'send') {
        setCodeSent(true);
        setDevCode(data.devCode ?? null);
        toast({ title: 'Code sent', description: `We texted a 6-digit code to ${data.phone}.` });
      } else {
        setCode('');
        setCodeSent(false);
        setDevCode(null);
        toast({ title: 'Phone verified' });
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  async function upload(kind: string, file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      const res = await fetch('/api/account/documents', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast({ variant: 'destructive', title: 'Upload failed', description: data.error ?? 'Please try another file.' });
      else {
        toast({ title: 'Document uploaded' });
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  if (!state) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  const label = state.tradingRoles.length ? state.tradingRoles.map((r, i) => (i === 0 ? r.label : r.label.toLowerCase())).join(' and ') : 'Customer';
  const roleBlocks = focus ? [...state.tradingRoles].sort((a, b) => Number(b.role === focus) - Number(a.role === focus)) : state.tradingRoles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Account verification
        </CardTitle>
        <CardDescription>
          {label} account · {state.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {state.needsReview && state.fullyApproved && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>You are verified</AlertTitle>
            <AlertDescription>An admin has approved your account. You can now trade on Closebuy.</AlertDescription>
          </Alert>
        )}
        {state.tradingRoles.filter((r) => r.approvalStatus === 'rejected').map((r) => (
          <Alert key={r.role} variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{r.label} verification needs attention</AlertTitle>
            <AlertDescription>{r.approvalNote} Replace the document(s) below and it goes back to the review queue.</AlertDescription>
          </Alert>
        ))}

        <Step done={state.emailVerified} title="Email address">
          <p className="text-sm text-muted-foreground">{state.emailVerified ? `${state.email} is confirmed.` : 'Enter the code we emailed you.'}</p>
        </Step>

        <Step done={state.phoneVerified || !state.phoneRequired} title="Phone number">
          {state.phoneVerified ? (
            <p className="text-sm text-muted-foreground">{state.phone} is verified.</p>
          ) : !state.phoneRequired ? (
            <p className="text-sm text-muted-foreground">
              {state.phone ? `${state.phone} is saved on your account.` : 'No phone number yet.'} Phone verification by SMS isn&apos;t switched on yet, so there&apos;s nothing to do here for now.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" inputMode="tel" />
                <Button type="button" variant="outline" onClick={() => phoneAction({ action: 'send', phone })} disabled={busy === 'send' || !phone}>
                  {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {codeSent ? 'Resend code' : 'Text me a code'}
                </Button>
              </div>
              {codeSent && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" />
                  <Button type="button" onClick={() => phoneAction({ action: 'verify', code })} disabled={busy === 'verify' || code.length !== 6}>
                    {busy === 'verify' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
              )}
              {devCode && (
                <Alert>
                  <FlaskConical className="h-4 w-4" />
                  <AlertDescription>
                    Development mode — no real SMS is sent. Your code is <span className="font-mono font-semibold">{devCode}</span>.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </Step>

        {state.needsReview && (
          <>
            {/* One block per role: a vendor who also delivers is reviewed separately for each. */}
            {roleBlocks.map((r) => {
              const many = state.tradingRoles.length > 1;
              return (
                <div key={r.role} className="space-y-6">
                  <Step done={r.documentsComplete} title={many ? `${r.label} documents` : 'Documents'}>
                    {r.requiredDocuments.map((d) => (
                      <div key={d.kind} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1 min-w-[12rem]">{d.label}</span>
                        {d.uploaded && d.id && (
                          <a href={`/api/account/documents/${d.id}`} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                            View
                          </a>
                        )}
                        {d.live ? (
                          // Selfies come only from the live camera check, never from a saved photo.
                          <Button type="button" variant={d.uploaded ? 'outline' : 'default'} size="sm" onClick={() => setLiveOpen(true)}>
                            <ScanFace className="mr-1.5 h-4 w-4" />
                            {d.uploaded ? 'Retake' : 'Start'}
                          </Button>
                        ) : (
                          <label className="inline-flex">
                            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => upload(d.kind, e.target.files?.[0])} />
                            <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                              {busy === d.kind ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                              {d.uploaded ? 'Replace' : 'Upload'}
                            </span>
                          </label>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {r.requiredDocuments.some((d) => d.live) && 'The live selfie uses your front camera: no photo uploads. '}
                      Documents: JPG, PNG, WebP{r.role === 'vendor' ? ' or PDF' : ''} up to 5 MB. Only you and Closebuy admins can see these files.
                    </p>
                  </Step>

                  <Step done={r.approvalStatus === 'approved'} title={many ? `${r.label} review` : 'Admin review'}>
                    {r.approvalStatus === 'approved' ? (
                      <Badge>Approved</Badge>
                    ) : r.approvalStatus === 'rejected' ? (
                      <Badge variant="destructive">Needs changes</Badge>
                    ) : r.readyForReview ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> Submitted — waiting for an admin to review your {r.label.toLowerCase()} documents.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Finish the steps above and your {r.label.toLowerCase()} profile goes to an admin for review.</p>
                    )}
                  </Step>
                </div>
              );
            })}
            <LiveSelfieCheck
              open={liveOpen}
              onOpenChange={setLiveOpen}
              onPassed={() => {
                toast({ title: 'Live selfie saved' });
                void load();
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
