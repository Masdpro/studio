
'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { ProductUploadForm } from '@/components/vendor/ProductUploadForm';
import { ProductListItem } from '@/components/vendor/ProductListItem';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackagePlus, PackageSearch, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VendorProductManagementPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
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
    if (!authLoading && user && role === 'vendor') {
      fetchProducts();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user, role, fetchProducts]);

  const handleProductAdd = async (newProductData: Omit<Product, 'id' | 'vendorId' | 'imageUrl'> & { imageUrl?: string }) => {
    const payload = {
      ...newProductData,
      imageUrl: newProductData.imageUrl || 'https://placehold.co/600x400.png',
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
      toast({ title: 'Failed to add product', variant: 'destructive' });
    }
  };

  const handleEditProduct = (productToEdit: Product) => {
    // Placeholder for edit functionality
    console.log('Editing product:', productToEdit);
    toast({ title: "Edit Action", description: `Editing ${productToEdit.name}. (Feature not fully implemented)` });
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

  if (!user || role !== 'vendor') {
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
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-primary" />
              Add to Inventory / List Product
            </CardTitle>
            <CardDescription>Add products from your inventory to display them on Dailybuy.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading form…</p>}>
              <ProductUploadForm onProductAdd={handleProductAdd} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-primary" />
              Your Listed Products
            </CardTitle>
            <CardDescription>View and manage your products listed on Dailybuy.</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">You haven&apos;t added any products yet.</p>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
