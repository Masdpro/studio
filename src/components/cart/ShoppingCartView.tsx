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
  { productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 2, imageUrl: 'https://placehold.co/100x100.png' },
  { productId: '3', name: 'Chicken Burger', price: 9.50, quantity: 1, imageUrl: 'https://placehold.co/100x100.png' },
];

export function ShoppingCartView() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCartItems(sampleCartItems);
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
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Your Shopping Cart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading cart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Your Shopping Cart
        </CardTitle>
      </CardHeader>
      <CardContent>
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
        <CardFooter className="flex flex-col items-stretch gap-4 p-6">
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
