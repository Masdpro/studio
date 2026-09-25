'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Vendor } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, vendorsRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/vendors'),
      ]);
      if (productsRes.ok) setProducts((await productsRes.json()).products);
      if (vendorsRes.ok) setVendors((await vendorsRes.json()).vendors);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.businessName ?? vendorId;

  const handleAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const res = await fetch(`/api/admin/products/${deletingProduct.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Product deleted', description: `${deletingProduct.name} has been removed.` });
      fetchData();
    } else {
      toast({ title: 'Failed to delete product', variant: 'destructive' });
    }
    setDeletingProduct(null);
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
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Every product listed across all vendors.</p>
          </div>
          <Button onClick={handleAdd} disabled={vendors.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> New Product
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Awoof</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="relative w-12 h-12 rounded-md overflow-hidden">
                        <SafeImage src={product.imageUrl} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="48px" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{vendorName(product.vendorId)}</TableCell>
                    <TableCell>
                      {product.discountPrice ? (
                        <span>
                          <span className="font-medium">₦{product.discountPrice.toLocaleString()}</span>{' '}
                          <span className="text-muted-foreground line-through text-xs">₦{product.price.toLocaleString()}</span>
                        </span>
                      ) : (
                        <span>₦{product.price.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell>{product.isAwoof && <Badge className="bg-red-600 hover:bg-red-600">Awoof</Badge>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingProduct(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No products yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ProductFormDialog
        product={editingProduct}
        vendors={vendors}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={fetchData}
      />
      <DeleteConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Delete this product?"
        description={`"${deletingProduct?.name}" will be permanently removed from Closebuy.`}
        onConfirm={handleDelete}
      />
    </AdminGate>
  );
}
