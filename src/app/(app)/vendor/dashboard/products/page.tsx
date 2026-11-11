
'use client';
import { useRequireTrading } from '@/hooks/use-trading-status';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { ProductUploadForm } from '@/components/vendor/ProductUploadForm';
import { QuickAddProducts } from '@/components/vendor/QuickAddProducts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockManager } from '@/components/vendor/StockManager';
import { EditProductDialog } from '@/components/vendor/EditProductDialog';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackagePlus, PackageSearch, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VendorProductManagementPage() {
  const { user, role, roles, loading: authLoading } = useAuth();
  useRequireTrading();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Only the first load shows the spinner; refreshes after a stock change update the list in place.
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/products');
      if (res.ok) {
        const { products } = await res.json();
        setProducts(products);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && roles.includes('vendor')) {
      fetchProducts();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, role, fetchProducts]);

  const handleProductAdd = async (newProductData: Omit<Product, 'id' | 'vendorId' | 'imageUrl'> & { imageUrl?: string }) => {
    const payload = {
      ...newProductData,
      imageUrl: newProductData.imageUrl,
      aiHint: newProductData.aiHint || 'product item',
    };
    const res = await fetch('/api/vendor/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchProducts();
      toast({ title: 'Product added!', description: `${newProductData.name} is now listed.` });
    } else {
      const { error } = await res.json().catch(() => ({}));
      toast({ title: 'Failed to add product', description: error, variant: 'destructive' });
    }
  };

  const handleEditProduct = (productToEdit: Product) => {
    setEditingProduct(productToEdit);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast({ title: "Product Deleted", description: "Product has been removed.", variant: "destructive" });
    } else {
      toast({ title: 'Failed to delete product', variant: 'destructive' });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  if (!user || !roles.includes('vendor')) {
    return (
      <div className="container mx-auto py-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Sign in with a vendor account to manage products.</p>
        <Button asChild>
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="min-w-0 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-primary" />
              Add products
            </CardTitle>
            <CardDescription>Pick from a ready-made list for your kind of business, or add one product at a time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quick">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="quick">Quick add</TabsTrigger>
                <TabsTrigger value="single">One at a time</TabsTrigger>
              </TabsList>
              <TabsContent value="quick">
                <QuickAddProducts existingNames={products.map((p) => p.name)} onAdded={fetchProducts} />
              </TabsContent>
              <TabsContent value="single">
                <Suspense fallback={<p className="text-muted-foreground text-sm">Loading form…</p>}>
                  <ProductUploadForm onProductAdd={handleProductAdd} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* On phones, once there are products, stock comes first: it's what vendors update every day. */}
      <div className={`min-w-0 lg:col-span-2 ${products.length ? 'order-first lg:order-none' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-primary" />
              Your products &amp; stock
            </CardTitle>
            <CardDescription>Update stock with + and −, mark items sold out, or pause them without deleting. Select several to change them together.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <StockManager products={products} onChanged={fetchProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <EditProductDialog
        product={editingProduct}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSaved={fetchProducts}
      />
    </div>
  );
}
