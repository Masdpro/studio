
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, CreditCard, Gift, CheckCircle, Copy as CopyIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const MOCK_VOUCHER_CODE_TO_REDEEM = "CLOSEBUYNG";
const MOCK_VOUCHER_VALUE = 5000.00;

const formatNumberWithCommas = (value: string): string => {
  if (value === null || value === undefined || value.trim() === '') return '';
  const parts = value.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]}`;
  }
  if (value.endsWith('.') && !integerPart.endsWith('.')) {
      return `${integerPart}.`;
  }
  return integerPart;
};

const parseFormattedNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

export function UserWalletDisplay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [isFundingWallet, setIsFundingWallet] = useState(false);
  const [buyVoucherAmount, setBuyVoucherAmount] = useState('');
  const [redeemVoucherCode, setRedeemVoucherCode] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const [generatedVoucherCode, setGeneratedVoucherCode] = useState<string | null>(null);
  const [voucherDisplayMode, setVoucherDisplayMode] = useState<'buy' | 'copy'>('buy');

  const fetchBalance = () => {
    fetch('/api/wallet')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wallet) setBalance(data.wallet.balance);
      })
      .catch(() => {});
  };

  useEffect(() => {
    setIsClient(true);
    fetchBalance();
    // Funding the wallet happens on Paystack's site, then redirects back into
    // an already-mounted app shell — the wallet:updated event is how that
    // callback page (and checkout, after a debit) tells us to refetch.
    window.addEventListener('wallet:updated', fetchBalance);
    return () => window.removeEventListener('wallet:updated', fetchBalance);
  }, []);

  // Shared by both the same-tab redirect-back path below and the new-tab
  // polling path in handleAddFunds — whichever one actually observes the
  // payment finish is the one that updates the UI.
  const applyVerifyResult = (data: { success: boolean; pending?: boolean; error?: string; newBalance?: number; amount?: number }) => {
    if (data.success) {
      setBalance(data.newBalance!);
      window.dispatchEvent(new Event('notifications:updated'));
      toast({
        title: 'Wallet Funded!',
        description: `₦${data.amount!.toLocaleString()} was added. New balance: ₦${data.newBalance!.toLocaleString()}.`,
      });
    } else if (!data.pending) {
      toast({
        title: 'Payment Not Completed',
        description: data.error ?? 'Your payment was not successful.',
        variant: 'destructive',
      });
    }
  };

  // Paystack redirects back to the homepage with ?reference=... after a wallet
  // top-up (this fires in whichever tab Paystack actually redirects — the
  // popup opened in handleAddFunds, if it wasn't blocked). Verify it here (a
  // toast, not a dedicated confirmation page) and strip the param so a
  // refresh doesn't re-trigger it.
  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref');
    if (!reference) return;

    fetch(`/api/payments/wallet/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to verify payment.');
        applyVerifyResult(data);
      })
      .catch((err) => {
        toast({
          title: 'Payment Not Completed',
          description: err instanceof Error ? err.message : 'Failed to verify payment.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        router.replace('/', { scroll: false });
      });
    // Only ever check the reference present on the very first load after the redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polls from the ORIGINAL tab, since Paystack opens in a new one and can't
  // reach back into this component directly. Stops on a definitive result,
  // when the popup is closed, or after ~5 minutes either way.
  const pollForPaymentResult = (reference: string, popup: Window) => {
    let attempts = 0;
    const maxAttempts = 100;
    const interval = setInterval(async () => {
      attempts += 1;
      let data: { success: boolean; pending?: boolean; error?: string; newBalance?: number; amount?: number } | null = null;
      try {
        const res = await fetch(`/api/payments/wallet/verify?reference=${encodeURIComponent(reference)}`);
        data = await res.json();
      } catch {
        // Transient network hiccup — just try again next tick.
      }

      const isDone = data && (data.success || !data.pending);
      if (isDone) {
        clearInterval(interval);
        setIsFundingWallet(false);
        applyVerifyResult(data!);
        return;
      }

      if (popup.closed || attempts >= maxAttempts) {
        clearInterval(interval);
        setIsFundingWallet(false);
        if (attempts >= maxAttempts) {
          toast({
            title: "Couldn't confirm payment",
            description: 'This is taking longer than expected. Check back shortly, or contact support if you were charged.',
            variant: 'destructive',
          });
        }
      }
    }, 3000);
  };

  const handleAddAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);

    if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
      if (numericValue.split('.').length <= 2) {
         setAddAmount(numericValue);
      }
    }
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }
    setIsFundingWallet(true);
    try {
      const res = await fetch('/api/payments/wallet/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to start payment.');

      // Open Paystack in its own tab rather than navigating Closebuy away —
      // this tab stays put and polls for the result instead.
      const popup = window.open(data.authorizationUrl, '_blank');
      if (!popup) {
        toast({
          title: 'Pop-up blocked',
          description: "Your browser blocked the payment tab — opening it here instead. Allow pop-ups for a smoother experience next time.",
        });
        window.location.href = data.authorizationUrl;
        return;
      }

      setAddAmount('');
      pollForPaymentResult(data.reference, popup);
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to start payment.',
        variant: 'destructive',
      });
      setIsFundingWallet(false);
    }
  };

  const handleBuyVoucherAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);
     if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
      if (numericValue.split('.').length <= 2) {
         setBuyVoucherAmount(numericValue);
         if (voucherDisplayMode === 'copy') {
           setVoucherDisplayMode('buy');
           setGeneratedVoucherCode(null);
         }
      }
    }
  };

  const handleBuyVoucher = () => {
    const amount = parseFloat(buyVoucherAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount for the voucher.',
        variant: 'destructive',
      });
      return;
    }
    const mockCode = `NGVC${Date.now().toString().slice(-6)}`;
    setGeneratedVoucherCode(mockCode);
    setVoucherDisplayMode('copy');
    toast({
      title: 'Voucher Purchased!',
      description: `A Closebuy Voucher for ₦${amount.toLocaleString()} purchased. Code: ${mockCode}`,
    });
    setBuyVoucherAmount('');
  };

  const handleCopyVoucherCode = async () => {
    if (!generatedVoucherCode) return;
    try {
      await navigator.clipboard.writeText(generatedVoucherCode);
      toast({
        title: 'Code Copied!',
        description: 'Voucher code copied to clipboard.',
      });
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy code.',
        variant: 'destructive',
      });
    }
  };

  const handleRedeemVoucher = () => {
    // Vouchers are still a local-only mock (not wired to Paystack or the DB),
    // unlike the balance above and "Add Funds" below — reloading loses this.
    if (redeemVoucherCode.toUpperCase() === MOCK_VOUCHER_CODE_TO_REDEEM) {
      setBalance((prev) => prev + MOCK_VOUCHER_VALUE);
      toast({
        title: 'Voucher Redeemed!',
        description: `₦${MOCK_VOUCHER_VALUE.toLocaleString()} has been added to your wallet.`,
      });
      setRedeemVoucherCode('');
      setVoucherDisplayMode('buy');
      setGeneratedVoucherCode(null);
    } else {
      toast({
        title: 'Invalid Code',
        description: 'The voucher code entered is not valid.',
        variant: 'destructive',
      });
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Wallet className="h-5 w-5" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Popover onOpenChange={(open) => {
      if (open) {
        fetchBalance();
      } else {
        setVoucherDisplayMode('buy');
        setGeneratedVoucherCode(null);
        setBuyVoucherAmount('');
      }
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-semibold">₦{balance.toLocaleString()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">My Wallet (Naira)</h4>
            <p className="text-sm text-muted-foreground">
              Your current account balance.
            </p>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">₦{balance.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Available Funds</p>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            <Label htmlFor="add-amount">Add Funds</Label>
            <div className="flex items-center gap-2">
              <Input
                id="add-amount"
                type="text"
                placeholder="Amount (e.g., 5,000)"
                value={formatNumberWithCommas(addAmount)}
                onChange={handleAddAmountChange}
                className="flex-1"
              />
              <Button onClick={handleAddFunds} size="icon" aria-label="Add Funds" disabled={isFundingWallet}>
                {isFundingWallet ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Closebuy Vouchers
            </h4>
             <p className="text-sm text-muted-foreground">
              Buy a voucher or redeem one.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="buy-voucher-input">
              {voucherDisplayMode === 'buy' ? 'Buy Voucher' : 'Purchased Voucher Code'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="buy-voucher-input"
                type="text"
                placeholder={voucherDisplayMode === 'buy' ? "Amount (e.g., 2,000)" : ""}
                value={voucherDisplayMode === 'buy' ? formatNumberWithCommas(buyVoucherAmount) : (generatedVoucherCode || '')}
                onChange={voucherDisplayMode === 'buy' ? handleBuyVoucherAmountChange : undefined}
                readOnly={voucherDisplayMode === 'copy'}
                className="flex-1"
              />
              {voucherDisplayMode === 'buy' ? (
                <Button onClick={handleBuyVoucher} size="sm" variant="outline">
                  <Gift className="mr-2 h-4 w-4" /> Buy
                </Button>
              ) : (
                <Button onClick={handleCopyVoucherCode} size="sm" variant="default">
                  <CopyIcon className="mr-2 h-4 w-4" /> Copy
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="redeem-voucher-code">Redeem Voucher</Label>
            <div className="flex items-center gap-2">
              <Input
                id="redeem-voucher-code"
                type="text"
                placeholder={`Enter code (e.g., ${MOCK_VOUCHER_CODE_TO_REDEEM})`}
                value={redeemVoucherCode}
                onChange={(e) => setRedeemVoucherCode(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleRedeemVoucher} size="sm">
                <CheckCircle className="mr-2 h-4 w-4" /> Redeem
              </Button>
            </div>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
