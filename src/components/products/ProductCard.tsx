
'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  vendorName: string;
}

export function ProductCard({ product, vendorName }: ProductCardProps) {
  const { toast } = useToast();

  const handleAddToCart = () => {
    console.log(`Added ${product.name} to cart`);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <Card className="w-full max-w-sm rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0 flex justify-center items-center"> {/* Centering for fixed size image */}
        {/* Diagnostic change: Using fixed width/height */}
        <div className="w-[300px] h-[200px] relative overflow-hidden"> {/* Fixed size container */}
          <Image
            src={product.imageUrl || "https://placehold.co/600x400.png"}
            alt={product.name}
            width={300}
            height={200}
            style={{ objectFit: 'cover' }}
            data-ai-hint={product.aiHint || "food item"}
            priority={product.id === '1' || product.id === '2' || product.id === '3'} // Prioritize loading for first few images
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-semibold mb-1">{product.name}</CardTitle>
        <CardDescription className="text-muted-foreground text-sm mb-2 min-h-[2.5rem] line-clamp-2">
          {product.description}
        </CardDescription>
        <Badge variant="secondary" className="mb-2 inline-flex items-center">
          <Store className="h-3 w-3 mr-1.5" />
          {vendorName}
        </Badge>
        <p className="text-lg font-bold text-primary mt-auto">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
