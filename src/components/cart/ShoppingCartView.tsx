'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { track, getSessionId } from '@/lib/track';
import { useRouter } from 'next/navigation';
import { cartLineKey } from '@/lib/cart-line';
import { CartItem } from './CartItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Loader2, MapPin, Wallet, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getBranchChoice } from '@/lib/branch-choice';
import { getSavedAddress, getAddressHistory, rememberAddress } from '@/lib/delivery-address';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { savePendingOrder, clearPendingOrder, ONLINE_PAYMENT_MAX } from '@/lib/pending-order';
import { payInPopup } from '@/lib/paystack-popup';
import { DELIVERY_FEE_MAX, DELIVERY_FEE_MIN } from '@/lib/delivery-fee';


type BranchInfo = { name: string; main: string; branches: { id: string; name: string; address: string; status?: string }[] };

export function ShoppingCartView() {
  const router = useRouter();
  const { items: cartItems, updateQuantity, removeItem, clear, subtotal } = useCart();
  const { user } = useAuth();
  // Items from the shopper's own business (e.g. added before they opened a store) can't be ordered.
  const ownItems = user?.ownVendorId ? cartItems.filter((i) => i.vendorId === user.ownVendorId) : [];
  const [isDeliverySelected, setIsDeliverySelected] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // While one choice is showing, what was typed for the other (delivery address / pickup name) waits here.
  const otherEntry = useRef<{ delivery: string; pickup: string }>({ delivery: '', pickup: '' });

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // The same box holds a delivery address, or the name of whoever collects a pickup order.
  const checks = useFieldChecks<'deliveryAddress'>({ deliveryAddress: isDeliverySelected ? rules.streetAddress : rules.personName });
  // Set when checkout fails for lack of funds; shown inline (the cart sheet is modal, so a toast button can't be clicked).
  const [fundsShort, setFundsShort] = useState<{ balance: number; needed: number; shortfall: number } | null>(null);
  const { toast } = useToast();
  // How to pay: from the wallet balance, or online with Paystack (card, bank transfer, USSD and more).
  const [payMethod, setPayMethod] = useState<'wallet' | 'online'>('wallet');
  const walletBalance = useWalletBalance(!!user);

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

  // Delivery is priced by distance from each shop to the address (each shop is its own order), capped at
  // ₦2,500 a shop. The server works it out the same way, so what's shown is exactly what's charged.
  const shopCount = new Set(cartItems.map((i) => i.vendorId ?? 'unknown-vendor')).size;
  const quoteKey = isDeliverySelected && deliveryAddress.trim().length >= 5
    ? JSON.stringify([deliveryAddress.trim().toLowerCase(), vendorKey, effectiveChoice])
    : '';
  const [quote, setQuote] = useState<{ key: string; fee: number; km: number | null; located: boolean } | null>(null);
  const [quoting, setQuoting] = useState(false);
  useEffect(() => {
    if (!quoteKey || !vendorKey) return;
    let off = false;
    setQuoting(true);
    const timer = setTimeout(() => {
      fetch('/api/delivery-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: deliveryAddress.trim(), shops: vendorKey.split(',').map((vendorId) => ({ vendorId, branchId: effectiveChoice[vendorId] })) }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { located: boolean; quotes: { fee: number; km: number | null }[] } | null) => {
          if (off || !d) return;
          const kms = d.quotes.map((q) => q.km).filter((k): k is number => k != null);
          setQuote({ key: quoteKey, fee: d.quotes.reduce((n, q) => n + q.fee, 0), km: kms.length ? Math.max(...kms) : null, located: d.located });
        })
        .catch(() => {})
        .finally(() => { if (!off) setQuoting(false); });
    }, 600);
    return () => { off = true; clearTimeout(timer); };
  }, [quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const feeReady = !isDeliverySelected || (!!quote && quote.key === quoteKey);
  const deliveryFee = isDeliverySelected ? (feeReady && quote ? quote.fee : 0) : 0;
  const total = subtotal + deliveryFee;
  // A changed cart or delivery choice means a different total — drop the stale warning.
  useEffect(() => { setFundsShort(null); }, [total]);

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

    if (!checks.validateAll({ deliveryAddress })) return;
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
    const orderBody = {
      items: cartItems,
      deliveryPreference: isDeliverySelected ? 'delivery' : 'pickup',
      deliveryAddress,
      sessionId: getSessionId(),
      branchSelections: effectiveChoice,
    };

    // Pay online: go to Paystack for the order total. The payment is recorded in the wallet first,
    // then /checkout/paid places this order from it, so the money is never lost if the order fails.
    if (payMethod === 'online') {
      if (total > ONLINE_PAYMENT_MAX) {
        toast({ title: 'Order too large to pay online', description: `Online payments go up to ₦${ONLINE_PAYMENT_MAX.toLocaleString()}. Please pay from your wallet.`, variant: 'destructive' });
        return;
      }
      setIsPlacingOrder(true);
      try {
        const res = await fetch('/api/payments/wallet/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, purpose: 'order' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.authorizationUrl) throw new Error(data.error ?? 'Could not start the payment.');
        savePendingOrder({
          reference: data.reference,
          total,
          body: orderBody,
          deliveryAddress: isDeliverySelected ? deliveryAddress.trim() : undefined,
          createdAt: Date.now(),
        });
        // Paystack opens as a pop-up over this page; once paid, /checkout/paid confirms it and places the order.
        const result = await payInPopup(data.accessCode);
        if (result === 'paid') {
          router.push(`/checkout/paid?reference=${encodeURIComponent(data.reference)}`);
          return;
        }
        if (result === 'cancelled') {
          clearPendingOrder();
          toast({ title: 'Payment cancelled', description: 'You have not been charged. Your cart is still here.' });
          setIsPlacingOrder(false);
          return;
        }
        // The pop-up couldn't load (e.g. blocked): use Paystack's own page in this tab instead.
        window.location.href = data.authorizationUrl;
      } catch (err) {
        toast({ title: 'Could not start the payment', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        setIsPlacingOrder(false);
      }
      return;
    }

    setIsPlacingOrder(true);
    setFundsShort(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to place order.' }));
        if (data?.code === 'INSUFFICIENT_FUNDS') {
          setFundsShort({
            balance: Number(data.balance) || 0,
            needed: Number(data.needed) || 0,
            shortfall: Math.ceil(Number(data.shortfall) || 0),
          });
          return;
        }
        throw new Error(data?.error ?? 'Failed to place order.');
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
        title: 'Could not place your order',
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
            {ownItems.length > 0 && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {ownItems.length === 1 ? `${ownItems[0].name} is` : `${ownItems.length} items are`} from your own store. You can&apos;t order from your own business, so please remove {ownItems.length === 1 ? 'it' : 'them'} to check out.
              </p>
            )}
            {cartItems.map((item) => (
              <CartItem
                key={cartLineKey(item)}
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
                if (delivery === isDeliverySelected) return;
                // Delivery and pickup each keep their own entry (an address, or a name): put away what was
                // typed for the old choice and bring back what belongs to the new one.
                otherEntry.current[isDeliverySelected ? 'delivery' : 'pickup'] = deliveryAddress;
                const kept = otherEntry.current[delivery ? 'delivery' : 'pickup'];
                setDeliveryAddress(kept || (delivery ? getSavedAddress()?.address ?? '' : ''));
                setIsDeliverySelected(delivery);
                // The box now asks for something else: drop the old message.
                checks.reset();
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
                {...checks.field('deliveryAddress', deliveryAddress, (v: string) => setDeliveryAddress(v))}
                onFocus={() => setAddrOpen(true)}
                onBlur={() => {
                  setAddrOpen(false);
                  checks.blur('deliveryAddress', deliveryAddress);
                }}
                autoComplete="off"
                placeholder={isDeliverySelected ? 'e.g. 12 Allen Avenue, Ikeja, Lagos' : 'e.g. Your name'}
                className="mt-1"
              />
              <FieldError message={checks.error('deliveryAddress')} />
              {isDeliverySelected && addrOpen && suggestions.length > 0 && (
                <ul role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  <li className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Recent addresses</li>
                  {suggestions.map((a) => (
                    <li key={a} role="option" aria-selected={deliveryAddress.trim().toLowerCase() === a.toLowerCase()}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setDeliveryAddress(a); checks.changed('deliveryAddress', a); setAddrOpen(false); }}
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
              <span className="text-muted-foreground">
                Delivery{shopCount > 1 ? ` (${shopCount} shops)` : ''}
                {feeReady && quote?.km != null ? ` · ${quote.km} km` : ''}
              </span>
              <span>
                {!quoteKey ? `₦${DELIVERY_FEE_MIN.toLocaleString()}–₦${DELIVERY_FEE_MAX.toLocaleString()}` : !feeReady || quoting ? <Loader2 className="inline h-3 w-3 animate-spin" /> : `₦${deliveryFee.toLocaleString()}`}
              </span>
            </div>
          )}
          {isDeliverySelected && feeReady && quote && !quote.located && !quoting && (
            <p className="text-[11px] text-muted-foreground">We couldn&apos;t find that address on the map, so delivery is the ₦{DELIVERY_FEE_MAX.toLocaleString()} maximum. Add the area or a landmark for an exact price.</p>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base mt-0.5">
            <span>Total</span>
            <span>₦{total.toLocaleString()}{isDeliverySelected && (!quoteKey || !feeReady) && <span className="text-xs font-normal text-muted-foreground"> + delivery</span>}</span>
          </div>
          <fieldset className="mt-1.5">
            <legend className="mb-1 text-xs text-muted-foreground">How would you like to pay?</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {([
                { id: 'wallet', icon: Wallet, title: 'Wallet', note: walletBalance === null ? 'Your balance' : `Balance ₦${walletBalance.toLocaleString()}` },
                { id: 'online', icon: CreditCard, title: 'Pay online', note: 'Card, transfer, USSD' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === m.id}
                  onClick={() => { setPayMethod(m.id); setFundsShort(null); }}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
                    payMethod === m.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-background hover:border-primary/50',
                  )}
                >
                  <m.icon className={cn('mt-0.5 h-4 w-4 shrink-0', payMethod === m.id ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{m.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{m.note}</span>
                  </span>
                </button>
              ))}
            </div>
            {payMethod === 'wallet' && walletBalance !== null && walletBalance < total && !fundsShort && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Your wallet is ₦{(total - walletBalance).toLocaleString()} short.{' '}
                <button type="button" className="font-medium text-primary underline" onClick={() => setPayMethod('online')}>Pay online instead</button>
              </p>
            )}
          </fieldset>
          {fundsShort && (
            <div role="alert" className="mt-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs">
              <p className="font-semibold text-destructive">Not enough in your wallet</p>
              <p className="mt-0.5 text-muted-foreground">
                Your wallet has ₦{fundsShort.balance.toLocaleString()} but this order costs ₦{fundsShort.needed.toLocaleString()}.
                Top up at least ₦{fundsShort.shortfall.toLocaleString()} to place it.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => window.dispatchEvent(new CustomEvent('wallet:open', { detail: { amount: fundsShort.shortfall } }))}
              >
                <Wallet className="mr-2 h-4 w-4" />Top up ₦{fundsShort.shortfall.toLocaleString()}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="mt-1 w-full" onClick={() => { setPayMethod('online'); setFundsShort(null); }}>
                <CreditCard className="mr-2 h-4 w-4" />Pay online instead
              </Button>
            </div>
          )}
          <Button
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-1.5"
            onClick={handleProceedToCheckout}
            disabled={isPlacingOrder || ownItems.length > 0 || (isDeliverySelected && !!quoteKey && (!feeReady || quoting))}
          >
            {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeliverySelected && (!quoteKey || !feeReady)
              ? (quoteKey ? 'Working out delivery…' : 'Enter your address to continue')
              : payMethod === 'online' ? `Pay ₦${total.toLocaleString()} online` : `Pay ₦${total.toLocaleString()} from wallet`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
