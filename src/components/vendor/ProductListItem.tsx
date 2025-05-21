
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';

interface ProductListItemProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  return (
    <Card className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg shadow-sm">
      <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden shrink-0">
        <Image
          src={product.imageUrl || "https://placehold.co/600x400.png"}
          alt={product.name}
          layout="fill"
          objectFit="cover"
          data-ai-hint={product.aiHint || "food item"}
        />
      </div>
      <div className="flex-grow">
        <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-1">
          {product.category || 'Uncategorized'}
        </CardDescription>
        <p className="text-sm line-clamp-2">{product.description}</p>
        <p className="text-md font-bold text-primary mt-1">${product.price.toFixed(2)}</p>
      </div>
      <div className="flex gap-2 mt-2 md:mt-0 md:flex-col">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
            <Edit className="mr-1 h-4 w-4 md:mr-0" /> <span className="md:hidden">Edit</span>
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)}>
            <Trash2 className="mr-1 h-4 w-4 md:mr-0" /> <span className="md:hidden">Delete</span>
          </Button>
        )}
      </div>
    </Card>
  );
}

    