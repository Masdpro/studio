
'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Store, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  vendorName: string;
  vendorLocation?: string;
  vendorStreetAddress: string;
  vendorCity: string;
  vendorCountry: string;
}

export function ProductCard({ 
  product, 
  vendorName, 
  vendorLocation,
  vendorStreetAddress,
  vendorCity,
  vendorCountry 
}: ProductCardProps) {
  const { toast } = useToast();
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  const handleAddToCart = () => {
    console.log(`Added ${product.name} to cart`);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const fullAddress = `${vendorStreetAddress}, ${vendorCity}, ${vendorCountry}`;

  return (
    <Card className="w-full max-w-sm rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="relative w-full h-48 overflow-hidden bg-muted">
        <img
          src={product.imageUrl || "https://placehold.co/300x200.png"}
          alt={product.name}
          data-ai-hint={product.aiHint || "food item"}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      </div>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-semibold mb-1">{product.name}</CardTitle>
        <CardDescription className="text-muted-foreground text-sm mb-2 min-h-[2.5rem] line-clamp-2">
          {product.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1 mb-2 items-center">
          <Link href={`/vendor/${product.vendorId}/profile`} passHref>
            <Badge variant="secondary" className="inline-flex items-center cursor-pointer hover:bg-secondary/80 transition-colors">
              <Store className="h-3 w-3 mr-1.5" />
              {vendorName}
            </Badge>
          </Link>
          {vendorLocation && (
            <button
              onClick={() => setIsAddressExpanded(!isAddressExpanded)}
              className="inline-flex items-center text-left"
              aria-expanded={isAddressExpanded}
              aria-controls={`address-details-${product.id}`}
            >
              <Badge variant="outline" className="inline-flex items-center cursor-pointer hover:bg-muted/50 transition-colors">
                <MapPin className="h-3 w-3 mr-1.5" />
                {vendorLocation}
                {isAddressExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Badge>
            </button>
          )}
        </div>
        {isAddressExpanded && (
          <div id={`address-details-${product.id}`} className="text-xs text-muted-foreground p-2 mt-1 mb-2 border rounded-md bg-muted/30">
            <p>{fullAddress}</p>
          </div>
        )}
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
