
'use client';

import { useState, useEffect } from 'react';
import type { CartItem as CartItemType } from '@/lib/types';
import { CartItem } from './CartItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Sample cart data
const sampleCartItems: CartItemType[] = [
  { productId: '1', name: 'Margherita Pizza', price: 12.99, quantity: 2, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'pizza margherita' },
  { productId: '3', name: 'Chicken Burger', price: 9.50, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'burger chicken' },
  { productId: 'p1', name: 'Laptop Pro 15"', price: 1299.99, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'laptop professional' },
  { productId: 'p2', name: 'Men\'s Casual Shirt', price: 39.50, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'shirt casual' },
  { productId: '7', name: 'Aromatic Coffee Beans', price: 15.99, quantity: 1, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'coffee beans' },
  { productId: '8', name: 'Artisan Bread Loaf', price: 6.50, quantity: 3, imageUrl: 'https://placehold.co/600x400.png', aiHint: 'bread artisan' },
];

export function ShoppingCartView() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDeliverySelected, setIsDeliverySelected] = useState(true); // Default to delivery
  const { toast } = useToast();

  useEffect(() => {
    const processedSampleItems = sampleCartItems.map(item => ({
        ...item,
        productId: item.productId || (item as any).id,
        imageUrl: item.imageUrl || 'https://placehold.co/600x400.png',
        aiHint: item.aiHint || 'product item'
    }));
    setCartItems(processedSampleItems);
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
  // Simulate delivery fee if delivery is selected
  const deliveryFee = isDeliverySelected ? 5.00 : 0;
  const total = subtotal + taxes + deliveryFee;

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    const deliveryMessage = isDeliverySelected ? "Delivery option selected." : "Self-pickup selected.";
    toast({
      title: 'Order Placed!',
      description: `Your order for $${total.toFixed(2)} has been successfully placed. ${deliveryMessage} Payment will be processed from your wallet.`,
    });
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
        <CardFooter className="flex flex-col items-stretch gap-1 p-3 border-t">
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="delivery-option"
              checked={isDeliverySelected}
              onCheckedChange={(checked) => setIsDeliverySelected(Boolean(checked))}
            />
            <Label
              htmlFor="delivery-option"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Would you like this delivered?
            </Label>
          </div>
          <Separator />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Taxes ({(taxRate * 100).toFixed(0)}%)</span>
            <span>${taxes.toFixed(2)}</span>
          </div>
          {isDeliverySelected && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base mt-0.5">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-1.5"
            onClick={handleProceedToCheckout}
          >
            Proceed to Checkout
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
