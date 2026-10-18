'use client';

import { useState, useEffect, useMemo } from 'react';
import { track, getSessionId } from '@/lib/track';
import { useRouter } from 'next/navigation';
import { CartItem } from './CartItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getBranchChoice } from '@/lib/branch-choice';
import { getSavedAddress, getAddressHistory, rememberAddress } from '@/lib/delivery-address';

type BranchInfo = { name: string; main: string; branches: { id: string; name: string; address: string; status?: string }[] };

export function ShoppingCartView() {
  const router = useRouter();
  const { items: cartItems, updateQuantity, removeItem, clear, subtotal } = useCart();
  const { user } = useAuth();
  const [isDeliverySelected, setIsDeliverySelected] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();

  // Vendors in the cart that have several branches: let the customer choose where to collect from.
  const [branchInfo, setBranchInfo] = useState<Record<string, BranchInfo>>({});
  const [branchChoice, setBranchChoice] = useState<Record<string, string>>({});
  useEffect(() => { setBranchChoice(getBranchChoice()); }, []);
  // An address entered on the home page is used for delivery unless the customer has already typed one.
  useEffect(() => {
    const saved = getSavedAddress();
    if (saved) setDeliveryAddress((cur) => cur || saved.address);
  }, []);
  // Addresses used on earlier orders (plus ones remembered in this browser) to pick from at checkout.
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);
  useEffect(() => {
    let off = false;
    const local = getAddressHistory().map((a) => a.address);
    setRecentAddresses(local.slice(0, 6));
    if (!user) return;
    fetch('/api/account/addresses')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { addresses?: string[] } | null) => {
        if (off || !d?.addresses) return;
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const a of [...d.addresses, ...local]) {
          const k = a.trim().toLowerCase();
          if (k && !seen.has(k)) { seen.add(k); merged.push(a.trim()); }
        }
        setRecentAddresses(merged.slice(0, 6));
      })
      .catch(() => {});
    return () => { off = true; };
  }, [user]);
  const [addrOpen, setAddrOpen] = useState(false);
  // Typing narrows the list; an empty box or an exact pick shows every recent address.
  const suggestions = recentAddresses.filter((a) => {
    const q = deliveryAddress.trim().toLowerCase();
    return !q || a.toLowerCase() === q || a.toLowerCase().includes(q);
  });
  // A remembered branch that no longer exists (or is closed) falls back to the main branch.
  const effectiveChoice = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [vendorId, info] of Object.entries(branchInfo)) {
      const c = branchChoice[vendorId];
      const b = info.branches.find((x) => x.id === c);
      out[vendorId] = b && b.status !== 'Closed' && b.status !== 'Temporarily Unavailable' ? c : 'main';
    }
    return out;
  }, [branchInfo, branchChoice]);
  const vendorKey = useMemo(
    () => Array.from(new Set(cartItems.map((i) => i.vendorId).filter(Boolean))).sort().join(','),
    [cartItems]
  );
  useEffect(() => {
    if (!vendorKey) { setBranchInfo({}); return; }
    let cancelled = false;
    fetch(`/api/branches?vendorIds=${encodeURIComponent(vendorKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.vendors) setBranchInfo(d.vendors); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [vendorKey]);

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

    track('checkout_start');
    setIsPlacingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          deliveryPreference: isDeliverySelected ? 'delivery' : 'pickup',
          deliveryAddress,
          sessionId: getSessionId(),
          branchSelections: effectiveChoice,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to place order.' }));
        throw new Error(error ?? 'Failed to place order.');
      }

      if (isDeliverySelected) rememberAddress({ address: deliveryAddress.trim() });
      clear();
      // This just debited the wallet and created a notification — tell the
      // header's already-mounted displays to refetch instead of going stale.
      window.dispatchEvent(new Event('wallet:updated'));
      window.dispatchEvent(new Event('notifications:updated'));
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
              onCheckedChange={(checked) => {
                const delivery = Boolean(checked);
                setIsDeliverySelected(delivery);
                const saved = getSavedAddress();
                // The saved address is for delivery; the pickup field wants a name instead.
                if (saved) setDeliveryAddress((cur) => (delivery ? cur || saved.address : cur === saved.address ? '' : cur));
              }}
            />
          </div>
          <div className="py-1">
            <Label htmlFor="delivery-address" className="text-xs text-muted-foreground">
              {isDeliverySelected ? 'Delivery address' : 'Name for pickup'}
            </Label>
            <div className="relative">
              <Input
                id="delivery-address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                onFocus={() => setAddrOpen(true)}
                onBlur={() => setAddrOpen(false)}
                autoComplete="off"
                placeholder={isDeliverySelected ? 'e.g. 12 Allen Avenue, Ikeja, Lagos' : 'e.g. Your name'}
                className="mt-1"
              />
              {isDeliverySelected && addrOpen && suggestions.length > 0 && (
                <ul role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  <li className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Recent addresses</li>
                  {suggestions.map((a) => (
                    <li key={a} role="option" aria-selected={deliveryAddress.trim().toLowerCase() === a.toLowerCase()}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setDeliveryAddress(a); setAddrOpen(false); }}
                        className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="break-words">{a}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
