
'use client';

import { useState, useEffect } from 'react';
import type { CartItem as CartItemType } from '@/lib/types';
import { CartItem } from './CartItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sample cart data
const sampleCartItems: CartItemType[] = [
  { productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 2, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'pizza margherita' },
  { productId: '3', name: 'Chicken Burger', price: 9.50, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'burger chicken' },
  { productId: 'p1', name: 'Laptop Pro 15"', description: 'High-performance laptop for professionals.', price: 1299.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Electronics', aiHint: 'laptop professional' },
  { productId: 'p2', name: 'Men\'s Casual Shirt', description: 'Comfortable cotton shirt for everyday wear.', price: 39.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Apparel', aiHint: 'shirt casual' },

];

export function ShoppingCartView() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCartItems(sampleCartItems.map(item => ({ ...item, imageUrl: item.imageUrl || 'https://placehold.co/600x400.png', aiHint: item.aiHint || 'food item' })));
    setIsClient(true);
  }, []);

  const handleQuantityChange = (productId: string, quantity: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ).filter(item => item.quantity > 0) 
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.productId !== productId));
    toast({
      title: "Item Removed",
      description: "The item has been removed from your cart.",
    });
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.08; // 8% tax
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    // Mock payment processing
    toast({
      title: 'Order Placed!',
      description: `Your order for $${total.toFixed(2)} has been successfully placed. Payment will be processed from your wallet.`,
    });
    // In a real app, you would then clear the cart, deduct from buyer wallet, credit seller, etc.
    // For this example, we'll keep the cart items for demo purposes.
    // setCartItems([]); 
  };

  if (!isClient) {
    return (
      <Card className="w-full flex-1 flex flex-col shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Your Shopping Cart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4 md:p-6">
          <p>Loading cart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-1 flex flex-col shadow-xl overflow-hidden">
      {/* CardHeader is part of the SheetHeader now, so we can omit it here if desired, 
          or keep it for consistency if ShoppingCartView is used elsewhere.
          For this sheet context, it's probably redundant if SheetHeader is present.
          Let's assume the SheetHeader in AppHeader is sufficient.
      */}
      {/* 
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Your Shopping Cart
        </CardTitle>
      </CardHeader> 
      */}
      <CardContent className="flex-grow overflow-y-auto p-4 md:p-6">
        {cartItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
        )}
      </CardContent>
      {cartItems.length > 0 && (
        <CardFooter className="flex flex-col items-stretch gap-4 p-6 border-t">
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxes ({(taxRate * 100).toFixed(0)}%)</span>
            <span>${taxes.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-xl">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button 
            size="lg" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4"
            onClick={handleProceedToCheckout}
          >
            Proceed to Checkout
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
