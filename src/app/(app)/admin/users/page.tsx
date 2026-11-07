'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Ban, Crown, Loader2, Mail, Search, ShieldMinus, Undo2, UserPlus } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type AdminUser = {
  id: string; email: string; name: string; phone: string; roles: string[];
  approvalStatus: string; emailVerified: boolean; suspended: boolean; suspendedReason: string; createdAt: string;
  isSuperAdmin: boolean; invitePending: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [suspending, setSuspending] = useState<AdminUser | null>(null);
  const [me, setMe] = useState<{ id: string; isSuperAdmin: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setMe(data.me ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? users.filter((u) => [u.email, u.name, u.phone, ...u.roles].some((v) => v.toLowerCase().includes(term))) : users;
  }, [users, q]);

  async function setSuspended(user: AdminUser, suspended: boolean, reason?: string) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suspended, reason }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast({ title: suspended ? 'Account suspended' : 'Account restored', description: suspended ? `${user.email} is signed out everywhere and their shop is hidden.` : `${user.email} can sign in again.` });
      setSuspending(null);
      load();
    } else {
      toast({ title: 'Could not update account', description: data.error, variant: 'destructive' });
    }
  }

  const admins = useMemo(() => users.filter((u) => u.roles.includes('admin')), [users]);

  async function addAdmin() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAdmin) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: 'Admin added', description: `${newAdmin.email} has been emailed a link to choose their password.` });
        if (data.devLink) console.info('[dev] admin invite link:', data.devLink);
        setAdding(false);
        setNewAdmin({ name: '', email: '' });
        load();
      } else {
        toast({ title: 'Could not add admin', description: data.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite(user: AdminUser) {
    const res = await fetch(`/api/admin/admins/${user.id}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.devLink) console.info('[dev] admin invite link:', data.devLink);
    toast(res.ok ? { title: 'Invite sent again', description: `A fresh link went to ${user.email}.` } : { title: 'Could not resend', description: data.error, variant: 'destructive' });
  }

  async function removeAdmin(user: AdminUser) {
    const res = await fetch(`/api/admin/admins/${user.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast({ title: 'Admin rights removed', description: `${user.email} has been signed out and is now a regular account.` });
      load();
    } else {
      toast({ title: 'Could not remove admin', description: data.error, variant: 'destructive' });
    }
    setRemoving(null);
  }

  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin</Link>
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Look up any account. Suspending blocks sign-in, signs them out everywhere and hides their shop.</p>
        </div>
        {me?.isSuperAdmin && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><Crown className="h-5 w-5 text-primary" />Admins</CardTitle>
                <CardDescription>As super admin, you decide who can run Closebuy. New admins get an email to choose their own password.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}><UserPlus className="mr-1 h-4 w-4" />Add admin</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {admins.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {a.name || '—'}
                      {a.isSuperAdmin && <Badge>Super admin</Badge>}
                      {a.id === me.id && <Badge variant="secondary">You</Badge>}
                      {a.invitePending && <Badge variant="outline">Invite pending</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </div>
                  {!a.isSuperAdmin && a.id !== me.id && (
                    <div className="flex gap-2">
                      {a.invitePending && (
                        <Button variant="outline" size="sm" onClick={() => resendInvite(a)}><Mail className="mr-1 h-4 w-4" />Resend invite</Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setRemoving(a)}><ShieldMinus className="mr-1 h-4 w-4" />Remove admin</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search email, name, phone or role" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                    </TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{u.isSuperAdmin && <Badge>super admin</Badge>}{u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div></TableCell>
                    <TableCell className="text-sm">
                      {u.suspended ? (
                        <div><Badge variant="destructive">Suspended</Badge><div className="mt-1 text-xs text-muted-foreground">{u.suspendedReason}</div></div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.approvalStatus !== 'approved' && <Badge variant="outline">{u.approvalStatus}</Badge>}
                          {!u.emailVerified && <Badge variant="outline">email unconfirmed</Badge>}
                          {u.approvalStatus === 'approved' && u.emailVerified && <Badge>Active</Badge>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(u.createdAt), 'd MMM yyyy')}</TableCell>
                    <TableCell className="text-right">
                      {u.roles.includes('admin') ? null : u.suspended ? (
                        <Button variant="outline" size="sm" onClick={() => setSuspended(u, false)}><Undo2 className="mr-1 h-4 w-4" />Restore</Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setSuspending(u)}><Ban className="mr-1 h-4 w-4" />Suspend</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No accounts match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={adding} onOpenChange={(o) => { if (!saving) setAdding(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an admin</DialogTitle>
            <DialogDescription>They'll get an email with a link (valid 3 days) to choose their password. Use their work email, not an address that already shops or sells on Closebuy.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addAdmin(); }}>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input id="admin-name" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} placeholder="E.g. Ada Okafor" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Work email</Label>
              <Input id="admin-email" type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} placeholder="ada@cbuyapp.com" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin rights?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing ? `${removing.email} will be signed out everywhere and lose access to the admin area. Their account stays, as a regular customer account. You can add them again later.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removing && removeAdmin(removing)}>Remove admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        open={!!suspending}
        onOpenChange={(o) => !o && setSuspending(null)}
        title="Suspend this account?"
        description={suspending ? `${suspending.email} will be signed out on every device and can't sign in. If they sell on Closebuy, their products are hidden. You can restore them later.` : ''}
        confirmLabel="Suspend account"
        placeholder="E.g. Repeated fake orders"
        onConfirm={(reason) => suspending ? setSuspended(suspending, true, reason) : Promise.resolve()}
      />
    </AdminGate>
  );
}
