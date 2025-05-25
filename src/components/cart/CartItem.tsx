
// src/components/cart/CartItem.tsx
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
    if (item.quantity > 0) {
      onQuantityChange(item.productId, item.quantity - 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b">
      {/* Image Block (Left) */}
      <div className="relative w-20 h-20 rounded-md overflow-hidden sm:shrink-0">
        <Image
          src={item.imageUrl || "https://placehold.co/80x80.png"}
          alt={item.name} 
          fill={true}
          style={{ objectFit: 'cover' }}
          data-ai-hint={item.aiHint || "product item"}
          sizes="80px"
        />
      </div>

      {/* Details Block (Right) */}
      <div className="flex-grow flex flex-col gap-1 sm:gap-2">
        {/* Name */}
        <h3 className="font-semibold text-base break-words">{item.name}</h3>

        {/* Grid for Price, Quantity, Total, Remove */}
        <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-x-4 gap-y-2">
          {/* Price (Col 1 on sm) */}
          <div className="sm:col-start-1 text-left">
            <p className="text-primary font-medium text-md">${item.price.toFixed(2)}</p>
          </div>

          {/* Quantity Controls (Col 2 on sm, centered) */}
          <div className="flex items-center gap-2 sm:col-start-2 sm:justify-self-center justify-start w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={decrementQuantity} disabled={item.quantity <= 0} className="h-8 w-8">
              <MinusCircle className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={item.quantity}
              onChange={handleQuantityChange}
              className="w-12 h-8 text-center text-sm"
              min="0"
            />
            <Button variant="ghost" size="icon" onClick={incrementQuantity} className="h-8 w-8">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Line Total (Col 3 on sm, aligned end) */}
          <div className="sm:col-start-3 sm:justify-self-end text-left sm:text-right w-full sm:w-auto">
            <p className="font-semibold text-md">${(item.price * item.quantity).toFixed(2)}</p>
          </div>
          
          {/* Remove Button (Col 4 on sm, aligned end) */}
          <div className="sm:col-start-4 sm:justify-self-end flex justify-end sm:justify-self-end w-full sm:w-auto">
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-8 w-8" onClick={() => onRemove(item.productId)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
