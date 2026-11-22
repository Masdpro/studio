'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, KeyRound, Loader2, Mail, MapPin, Pencil, Phone, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { DeleteAccountCard } from '@/components/account/DeleteAccountCard';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';

const DETAIL_RULES = { name: rules.personName, address: rules.optional(rules.streetAddress) };
const PHONE_RULES = { phone: rules.phone };
const PASSWORD_RULES = { current: (v: string) => (v ? null : 'Enter your current password.'), next: rules.newPassword };

type Profile = { name: string; email: string; phone: string; phoneVerified: boolean; address: string };

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

export default function CustomerProfilePage() {
  const { user, loading, refresh, signOut } = useAuth();
  const router = useRouter();
  // Opened as its own page (not inside the header's profile drawer, which has a close button).
  const standalone = usePathname() === '/profile';
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<'view' | 'details' | 'phone' | 'password'>('view');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const details = useFieldChecks<'name' | 'address'>(DETAIL_RULES);
  const phoneCheck = useFieldChecks<'phone'>(PHONE_RULES);
  const pw = useFieldChecks<'current' | 'next'>(PASSWORD_RULES);

  const load = useCallback(() => {
    fetch('/api/account/profile').then((r) => (r.ok ? r.json() : null)).then((p) => p && setProfile(p));
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const fail = (e: unknown) => toast({ variant: 'destructive', title: 'Not saved', description: e instanceof Error ? e.message : 'Try again.' });
  const done = (title: string) => { toast({ title }); setMode('view'); load(); };

  if (loading) return <div className="container mx-auto py-8 text-center text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="container mx-auto space-y-4 py-8 text-center">
        <p className="text-lg text-muted-foreground">Sign in to see your profile.</p>
        <Button asChild><Link href="/auth/login">Sign In</Link></Button>
      </div>
    );
  }
  if (!profile) return <Loader2 className="mx-auto my-12 h-6 w-6 animate-spin text-primary" />;

  const initials = (profile.name || profile.email).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  async function saveDetails() {
    if (!details.validateAll({ name, address })) return;
    setBusy(true);
    try { await call('/api/account/profile', 'PATCH', { name, address }); await refresh(); done('Profile updated'); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function sendCode() {
    if (!phoneCheck.validateAll({ phone })) return;
    setBusy(true);
    try {
      const d = await call('/api/account/phone', 'POST', { action: 'send', phone });
      setCodeSent(true);
      toast({ title: 'Code sent', description: d.devCode ? `Dev code: ${d.devCode}` : `We texted a 6-digit code to ${d.phone}.` });
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function verifyCode() {
    setBusy(true);
    try { await call('/api/account/phone', 'POST', { action: 'verify', code }); setCodeSent(false); setCode(''); done('Phone number verified'); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function savePassword() {
    if (!pw.validateAll({ current, next })) return;
    if (current === next) return toast({ variant: 'destructive', title: 'Choose a different password', description: 'The new password must be different from your current one.' });
    setBusy(true);
    try {
      await call('/api/account/profile', 'PATCH', { currentPassword: current, newPassword: next });
      setCurrent(''); setNext('');
      toast({ title: 'Password changed', description: 'For your security, every device has been signed out. Please sign in with your new password.' });
      await signOut();
      router.push('/auth/login?changed=1');
    }
    catch (e) { fail(e); } finally { setBusy(false); }
  }

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode, action?: React.ReactNode) => (
    <div className="flex items-center gap-4 rounded-md bg-muted/50 p-3">
      <div className="text-primary">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="break-words font-medium">{value}</div>
      </div>
      {action}
    </div>
  );
  const spin = busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />;

  return (
    <div className="container mx-auto py-8">
      {standalone && (
        <div className="mx-auto mb-3 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? router.back() : router.push('/shop'))}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        </div>
      )}
      <Card className="mx-auto w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <Avatar className="mx-auto mb-4 h-24 w-24 border-2 border-primary">
            <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold">{profile.name || 'Your profile'}</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'details' ? (
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-2"><Label htmlFor="pf-name">Full name</Label><Input id="pf-name" value={name} onChange={(e) => { setName(e.target.value); details.changed('name', e.target.value); }} {...details.bind('name', name)} /><FieldError message={details.error('name')} /></div>
              <div className="space-y-2"><Label htmlFor="pf-address">Address</Label><Input id="pf-address" value={address} onChange={(e) => { setAddress(e.target.value); details.changed('address', e.target.value); }} {...details.bind('address', address)} placeholder="House number, street, city" /><FieldError message={details.error('address')} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMode('view')} disabled={busy}>Cancel</Button>
                <Button onClick={saveDetails} disabled={busy || details.hasErrors}>{spin}Save changes</Button>
              </div>
            </div>
          ) : (
            <>
              {row(<User className="h-5 w-5" />, 'Name', profile.name || '—')}
              {row(<Mail className="h-5 w-5" />, 'Email', profile.email)}
              {row(<MapPin className="h-5 w-5" />, 'Address', profile.address || <span className="text-muted-foreground">Not added yet</span>)}
            </>
          )}

          {row(
            <Phone className="h-5 w-5" />,
            'Phone',
            <span className="flex items-center gap-2">
              {profile.phone || <span className="text-muted-foreground">Not added yet</span>}
              {profile.phone && profile.phoneVerified && <BadgeCheck className="h-4 w-4 text-green-600" aria-label="Verified" />}
              {profile.phone && !profile.phoneVerified && <span className="text-xs text-amber-600">Not verified</span>}
            </span>,
            mode !== 'phone' && <Button variant="ghost" size="sm" onClick={() => { setPhone(''); setCode(''); setCodeSent(false); phoneCheck.reset(); setMode('phone'); }}>{profile.phone ? 'Change' : 'Add'}</Button>
          )}
          {mode === 'phone' && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="space-y-2">
                <Label htmlFor="pf-phone">New phone number</Label>
                <div className="flex gap-2">
                  <Input id="pf-phone" inputMode="tel" placeholder="08012345678" value={phone} onChange={(e) => { setPhone(e.target.value); phoneCheck.changed('phone', e.target.value); }} {...phoneCheck.bind('phone', phone)} disabled={codeSent} />
                  <Button onClick={sendCode} disabled={busy || !phone.trim() || phoneCheck.hasErrors} variant={codeSent ? 'outline' : 'default'}>{spin}{codeSent ? 'Resend' : 'Send code'}</Button>
                </div>
                <FieldError message={phoneCheck.error('phone')} />
              </div>
              {codeSent && (
                <div className="space-y-2">
                  <Label htmlFor="pf-code">6-digit code</Label>
                  <div className="flex gap-2">
                    <Input id="pf-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
                    <Button onClick={verifyCode} disabled={busy || code.trim().length !== 6}>{spin}Verify</Button>
                  </div>
                </div>
              )}
              <div className="flex justify-end"><Button variant="outline" onClick={() => setMode('view')} disabled={busy}>Cancel</Button></div>
            </div>
          )}

          {mode === 'password' && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-2"><Label htmlFor="pf-cur">Current password</Label><Input id="pf-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); pw.changed('current', e.target.value); }} {...pw.bind('current', current)} /><FieldError message={pw.error('current')} /></div>
              <div className="space-y-2"><Label htmlFor="pf-new">New password</Label><Input id="pf-new" type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); pw.changed('next', e.target.value); }} {...pw.bind('next', next)} placeholder="At least 8 characters" /><FieldError message={pw.error('next')} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMode('view')} disabled={busy}>Cancel</Button>
                <Button onClick={savePassword} disabled={busy || pw.hasErrors}>{spin}Change password</Button>
              </div>
            </div>
          )}

          {mode === 'view' && (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => { setCurrent(''); setNext(''); pw.reset(); setMode('password'); }}><KeyRound className="mr-2 h-4 w-4" />Change password</Button>
              <Button onClick={() => { setName(profile.name); setAddress(profile.address); details.reset(); setMode('details'); }}><Pencil className="mr-2 h-4 w-4" />Edit profile</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mx-auto mt-6 max-w-2xl">
        <DeleteAccountCard onDeleted={async () => { toast({ title: 'Your account has been deleted' }); await signOut(); router.replace('/shop'); }} />
      </div>
    </div>
  );
}
