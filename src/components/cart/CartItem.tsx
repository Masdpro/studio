'use client';

import Image from 'next/image';
import type { CartItem as CartItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onQuantityChange(item.productId, newQuantity);
    }
  };

  const incrementQuantity = () => {
    onQuantityChange(item.productId, item.quantity + 1);
  };

  const decrementQuantity = () => {
    if (item.quantity > 0) { // Or > 1 if you want to remove at 0
      onQuantityChange(item.productId, item.quantity - 1);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <div className="relative w-20 h-20 rounded-md overflow-hidden shrink-0">
        <Image
          src={item.imageUrl || "https://placehold.co/100x100.png"}
          alt={item.name}
          layout="fill"
          objectFit="cover"
          data-ai-hint="food item"
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-lg">{item.name}</h3>
        <p className="text-primary font-medium">${item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={decrementQuantity} disabled={item.quantity <= 0}>
          <MinusCircle className="h-5 w-5" />
        </Button>
        <Input
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          className="w-16 text-center h-10"
          min="0"
        />
        <Button variant="ghost" size="icon" onClick={incrementQuantity}>
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>
      <p className="font-semibold w-24 text-right">${(item.price * item.quantity).toFixed(2)}</p>
      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => onRemove(item.productId)}>
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
