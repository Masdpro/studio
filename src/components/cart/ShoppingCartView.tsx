'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartItem } from './CartItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export function ShoppingCartView() {
  const router = useRouter();
  const { items: cartItems, updateQuantity, removeItem, clear, subtotal } = useCart();
  const { user } = useAuth();
  const [isDeliverySelected, setIsDeliverySelected] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
    toast({
      title: "Item Removed",
      description: "The item has been removed from your cart.",
    });
  };

  const deliveryFee = isDeliverySelected ? 1500 : 0;
  const total = subtotal + deliveryFee;

  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to place an order.',
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: isDeliverySelected ? 'Delivery address required' : 'Pickup name required',
        description: isDeliverySelected
          ? 'Please enter where this should be delivered.'
          : 'Please enter a name so the vendor knows who is picking up.',
        variant: 'destructive',
      });
      return;
    }

    setIsPlacingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          deliveryPreference: isDeliverySelected ? 'delivery' : 'pickup',
          deliveryAddress,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to place order.' }));
        throw new Error(error ?? 'Failed to place order.');
      }

      clear();
      toast({
        title: 'Order Placed!',
        description: `Your order for ₦${total.toLocaleString()} has been successfully placed.`,
      });
      router.push('/orders');
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Card className="w-full flex-1 flex flex-col shadow-xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Your Shopping Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 md:p-6">
        {cartItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onQuantityChange={updateQuantity}
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
          <div className="py-1">
            <Label htmlFor="delivery-address" className="text-xs text-muted-foreground">
              {isDeliverySelected ? 'Delivery address' : 'Name for pickup'}
            </Label>
            <Input
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={isDeliverySelected ? 'e.g. 12 Allen Avenue, Ikeja, Lagos' : 'e.g. Your name'}
              className="mt-1"
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
            disabled={isPlacingOrder}
          >
            {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Proceed to Checkout
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
