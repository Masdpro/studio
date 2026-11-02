'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Ban, Loader2, Search, Undo2 } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type AdminUser = {
  id: string; email: string; name: string; phone: string; roles: string[];
  approvalStatus: string; emailVerified: boolean; suspended: boolean; suspendedReason: string; createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [suspending, setSuspending] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers((await res.json()).users);
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
                    <TableCell><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div></TableCell>
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
