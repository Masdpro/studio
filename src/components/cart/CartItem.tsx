
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
    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border-b"> {/* Main container */}
      {/* Left Side: Image and Name */}
      <div className="flex flex-col items-center w-full sm:w-20 sm:shrink-0">
        <div className="relative w-20 h-20 rounded-md overflow-hidden">
          <Image
            src={item.imageUrl || "https://placehold.co/80x80.png"}
            alt={item.name}
            fill={true}
            style={{ objectFit: 'cover' }}
            data-ai-hint={item.aiHint || "product item"}
            sizes="80px"
          />
        </div>
        <h3 className="font-semibold text-sm mt-1 text-center w-full break-words">{item.name}</h3>
      </div>

      {/* Right Side: Price, Quantity, Total, Remove Button */}
      <div className="flex-grow flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-x-4 gap-y-3 w-full mt-2 sm:mt-0">
        {/* Price (Stacks first on small, Col 1 on sm) */}
        <div className="sm:col-start-1 text-left">
          <p className="text-primary font-medium text-md">${item.price.toFixed(2)}</p>
        </div>

        {/* Quantity Controls (Stacks second on small, Col 2 on sm, centered in grid cell) */}
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

        {/* Line Total (Stacks third on small, Col 3 on sm, aligned end in grid cell) */}
        <div className="sm:col-start-3 sm:justify-self-end text-left sm:text-right w-full sm:w-auto">
          <p className="font-semibold text-md">${(item.price * item.quantity).toFixed(2)}</p>
        </div>
        
        {/* Remove Button (Stacks last on small, Col 4 on sm, aligned end in grid cell) */}
        <div className="sm:col-start-4 sm:justify-self-end flex justify-end sm:justify-self-end w-full sm:w-auto">
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-8 w-8" onClick={() => onRemove(item.productId)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
