'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER_OPEN } from '@/lib/state-machines';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, RotateCcw, Search } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';

type AdminOrder = Order & { customerName: string; customerEmail?: string; vendorName: string };

const ALL = 'all';
const OPEN_STATUSES = ORDER_OPEN;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(ALL);
  const [q, setQ] = useState('');
  const [refunding, setRefunding] = useState<AdminOrder | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) setOrders((await res.json()).orders);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) =>
      (status === ALL || (status === 'open' ? OPEN_STATUSES.includes(o.status) : o.status === status)) &&
      (!term || [o.id, o.customerName, o.customerEmail ?? '', o.vendorName, ...o.items.map((i) => i.name)].some((v) => v.toLowerCase().includes(term)))
    );
  }, [orders, status, q]);

  const totals = useMemo(() => ({
    open: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    value: orders.filter((o) => o.status !== 'Cancelled').reduce((n, o) => n + o.totalAmount, 0),
  }), [orders]);

  async function refund(reason: string) {
    if (!refunding) return;
    const res = await fetch(`/api/admin/orders/${refunding.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast({ title: 'Order refunded', description: `₦${Number(data.refunded).toLocaleString()} returned to ${refunding.customerName}. Both sides were notified.` });
      setRefunding(null);
      load();
    } else {
      toast({ title: 'Could not refund', description: data.error, variant: 'destructive' });
    }
  }

  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin</Link>
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Every order on Closebuy. Refund a customer when an order goes wrong. {orders.length > 0 && `${totals.open} open · ₦${totals.value.toLocaleString()} in non-cancelled orders.`}</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search order ID, customer, shop or item" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="open">Open (not finished)</SelectItem>
              {['Pending', 'Processing', 'ReadyForPickup', 'ReadyForCustomerPickup', 'AcceptedByAgent', 'PickedUpByAgent', 'Delivered', 'PickedUpByCustomer', 'Cancelled'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(o.createdAt), 'd MMM yyyy, HH:mm')}</div>
                    </TableCell>
                    <TableCell><div className="font-medium">{o.customerName}</div><div className="text-xs text-muted-foreground">{o.customerEmail}</div></TableCell>
                    <TableCell>{o.vendorName}</TableCell>
                    <TableCell className="max-w-[16rem] text-sm">
                      {o.items.map((i) => `${i.name} ×${i.quantity}${i.color ? `, ${i.color}` : ''}${i.size ? `, ${i.size}` : ''}`).join('; ')}
                    </TableCell>
                    <TableCell className="text-right font-medium">₦{o.totalAmount.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={o.status === 'Cancelled' ? 'destructive' : o.status === 'Delivered' || o.status === 'PickedUpByCustomer' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {o.status !== 'Cancelled' && (
                        <Button variant="outline" size="sm" onClick={() => setRefunding(o)}>
                          <RotateCcw className="mr-1 h-4 w-4" />Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No orders match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ReasonDialog
        open={!!refunding}
        onOpenChange={(o) => !o && setRefunding(null)}
        title="Cancel and refund this order?"
        description={refunding ? `${refunding.customerName} gets ₦${refunding.totalAmount.toLocaleString()} back in their wallet, and the order from ${refunding.vendorName} is cancelled. This can't be undone.` : ''}
        confirmLabel="Refund customer"
        placeholder="E.g. Item never arrived"
        onConfirm={refund}
      />
    </AdminGate>
  );
}
