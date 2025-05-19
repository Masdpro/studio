'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();

  const handleAddToCart = () => {
    // Placeholder for add to cart logic
    console.log(`Added ${product.name} to cart`);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <Card className="w-full max-w-sm rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={product.imageUrl || "https://placehold.co/600x400.png"}
            alt={product.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint="product item"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl font-semibold mb-1">{product.name}</CardTitle>
        <CardDescription className="text-muted-foreground text-sm mb-2 h-10 overflow-hidden">
          {product.description}
        </CardDescription>
        <p className="text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
