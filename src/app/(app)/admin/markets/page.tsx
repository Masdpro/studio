'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { MarketFormDialog } from '@/components/admin/MarketFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Market } from '@/lib/types';

export default function AdminMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingMarket, setDeletingMarket] = useState<Market | null>(null);
  const { toast } = useToast();

  const fetchMarkets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/markets');
      if (res.ok) {
        const { markets } = await res.json();
        setMarkets(markets);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const handleAdd = () => {
    setEditingMarket(null);
    setIsFormOpen(true);
  };

  const handleEdit = (market: Market) => {
    setEditingMarket(market);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMarket) return;
    const res = await fetch(`/api/admin/markets/${deletingMarket.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Market deleted', description: `${deletingMarket.name} has been removed.` });
      fetchMarkets();
    } else {
      toast({ title: 'Failed to delete market', variant: 'destructive' });
    }
    setDeletingMarket(null);
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
            <h1 className="text-2xl font-bold">Markets</h1>
            <p className="text-muted-foreground">The local markets shown on the home page.</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> New Market
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
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Trending</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((market) => (
                  <TableRow key={market.id}>
                    <TableCell>
                      <div className="relative w-12 h-12 rounded-md overflow-hidden">
                        <SafeImage src={market.imageUrl} alt={market.name} fill style={{ objectFit: 'cover' }} sizes="48px" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/market/${market.id}`} className="hover:underline" target="_blank">
                        {market.name}
                      </Link>
                    </TableCell>
                    <TableCell>{market.locationTag}</TableCell>
                    <TableCell>{market.isTrending && <Badge>Trending</Badge>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(market)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingMarket(market)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {markets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No markets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <MarketFormDialog
        market={editingMarket}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={fetchMarkets}
      />
      <DeleteConfirmDialog
        open={!!deletingMarket}
        onOpenChange={(open) => !open && setDeletingMarket(null)}
        title="Delete this market?"
        description={`"${deletingMarket?.name}" will be removed. Vendors already linked to it will keep their marketId, but the market page will 404 until it's reassigned or removed.`}
        onConfirm={handleDelete}
      />
    </AdminGate>
  );
}
