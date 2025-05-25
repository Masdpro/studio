
'use client';

import { useState } from 'react';
import { ProductUploadForm } from '@/components/vendor/ProductUploadForm';
import { ProductListItem } from '@/components/vendor/ProductListItem';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackagePlus, PackageSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sample initial products for a vendor
const initialProducts: Product[] = [
  { id: 'p1', vendorId: 'v123', name: 'Laptop Pro 15"', description: 'High-performance laptop for professionals.', price: 1299.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'laptop professional' },
  { id: 'p2', vendorId: 'v123', name: 'Men\'s Casual Shirt', description: 'Comfortable cotton shirt for everyday wear.', price: 39.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'shirt casual' },
];

export default function VendorProductManagementPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const { toast } = useToast();

  const handleProductAdd = (newProductData: Omit<Product, 'id' | 'vendorId'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: `p${Date.now()}`, // Simple unique ID
      vendorId: 'v123', // Placeholder vendor ID
      imageUrl: newProductData.imageUrl || 'https://placehold.co/600x400.png',
      aiHint: newProductData.aiHint || 'product item',
    };
    setProducts((prevProducts) => [newProduct, ...prevProducts]);
  };

  const handleEditProduct = (productToEdit: Product) => {
    // Placeholder for edit functionality
    console.log('Editing product:', productToEdit);
    toast({ title: "Edit Action", description: `Editing ${productToEdit.name}. (Feature not fully implemented)` });
  };

  const handleDeleteProduct = (productId: string) => {
    // Placeholder for delete functionality
    setProducts((prevProducts) => prevProducts.filter(p => p.id !== productId));
    toast({ title: "Product Deleted", description: "Product has been removed.", variant: "destructive" });
  };


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
            <ProductUploadForm onProductAdd={handleProductAdd} />
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

    