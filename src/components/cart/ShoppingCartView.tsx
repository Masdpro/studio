
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
import { sampleProductsForMockOrders } from '@/lib/mockData';

export function ShoppingCartView() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDeliverySelected, setIsDeliverySelected] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const processedSampleItems = sampleProductsForMockOrders.slice(0, 3).map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        imageUrl: item.imageUrl,
        aiHint: item.aiHint
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
  const deliveryFee = isDeliverySelected ? 1500 : 0;
  const total = subtotal + deliveryFee;

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
      description: `Your order for ₦${total.toLocaleString()} has been successfully placed. ${deliveryMessage} Payment will be processed from your wallet.`,
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
            <Label
              htmlFor="delivery-option"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Would you like this delivered?
            </Label>
            <Checkbox
              id="delivery-option"
              checked={isDeliverySelected}
              onCheckedChange={(checked) => setIsDeliverySelected(Boolean(checked))}
            />
          </div>
          <Separator />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>
          {isDeliverySelected && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>₦{deliveryFee.toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base mt-0.5">
            <span>Total</span>
            <span>₦{total.toLocaleString()}</span>
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
