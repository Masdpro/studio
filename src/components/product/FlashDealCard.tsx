
'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';

interface FlashDealCardProps {
  product: Product;
}

export function FlashDealCard({ product }: FlashDealCardProps) {
  const { toast } = useToast();
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(product);
    toast({
      title: "Awoof Added!",
      description: `${product.name} at a special price added to cart.`,
    });
  };

  const discountPercentage = Math.round(((product.price - (product.discountPrice || 0)) / product.price) * 100);

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 hover:border-primary transition-all group shrink-0 w-64 md:w-72 shadow-lg">
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="destructive" className="flex items-center gap-1 animate-pulse px-2 py-1">
          <Zap className="h-3 w-3 fill-current" />
          AWOOF -{discountPercentage}%
        </Badge>
      </div>
      <div className="relative aspect-square w-full">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          data-ai-hint={product.aiHint || "flash deal"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <div className="text-white">
            <h3 className="font-bold text-lg leading-tight line-clamp-1">{product.name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-primary">₦{(product.discountPrice || product.price).toLocaleString()}</span>
              <span className="text-sm line-through opacity-70">₦{product.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <Button onClick={handleAddToCart} size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          <ShoppingCart className="h-4 w-4 mr-2" /> Grab Deal
        </Button>
      </CardContent>
    </Card>
  );
}
