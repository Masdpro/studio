'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { VendorFormDialog } from '@/components/admin/VendorFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Market, Vendor } from '@/lib/types';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendorsRes, marketsRes] = await Promise.all([
        fetch('/api/admin/vendors'),
        fetch('/api/admin/markets'),
      ]);
      if (vendorsRes.ok) setVendors((await vendorsRes.json()).vendors);
      if (marketsRes.ok) setMarkets((await marketsRes.json()).markets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const marketName = (marketId?: string) => markets.find((m) => m.id === marketId)?.name;

  const handleAdd = () => {
    setEditingVendor(null);
    setIsFormOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingVendor) return;
    const res = await fetch(`/api/admin/vendors/${deletingVendor.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Vendor deleted', description: `${deletingVendor.businessName} has been removed.` });
      fetchData();
    } else {
      toast({ title: 'Failed to delete vendor', variant: 'destructive' });
    }
    setDeletingVendor(null);
  };

  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Vendors</h1>
            <p className="text-muted-foreground">Vendor stalls, including which market they belong to.</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> New Vendor
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.businessName}</TableCell>
                    <TableCell>{vendor.city}</TableCell>
                    <TableCell>
                      {vendor.marketId ? (
                        <Link href={`/market/${vendor.marketId}`} className="hover:underline" target="_blank">
                          {marketName(vendor.marketId) ?? vendor.marketId}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === 'Open' ? 'default' : 'outline'}>{vendor.status ?? 'Open'}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingVendor(vendor)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No vendors yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <VendorFormDialog
        vendor={editingVendor}
        markets={markets}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={fetchData}
      />
      <DeleteConfirmDialog
        open={!!deletingVendor}
        onOpenChange={(open) => !open && setDeletingVendor(null)}
        title="Delete this vendor?"
        description={`"${deletingVendor?.businessName}" and its stall page will be removed. Its products will remain but won't be reachable through any market or storefront until reassigned.`}
        onConfirm={handleDelete}
      />
    </AdminGate>
  );
}
