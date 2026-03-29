
'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard, Gift, CheckCircle, Copy as CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const INITIAL_BALANCE = 50000.00;
const MOCK_VOUCHER_CODE_TO_REDEEM = "DAILYBUYNG";
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
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [addAmount, setAddAmount] = useState('');
  const [buyVoucherAmount, setBuyVoucherAmount] = useState('');
  const [redeemVoucherCode, setRedeemVoucherCode] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const [generatedVoucherCode, setGeneratedVoucherCode] = useState<string | null>(null);
  const [voucherDisplayMode, setVoucherDisplayMode] = useState<'buy' | 'copy'>('buy');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);

    if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
      if (numericValue.split('.').length <= 2) {
         setAddAmount(numericValue);
      }
    }
  };

  const handleAddFunds = () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }
    setBalance((prev) => prev + amount);
    toast({
      title: 'Funds Added!',
      description: `₦${amount.toLocaleString()} has been added to your wallet.`,
    });
    setAddAmount('');
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
      description: `A Dailybuy Voucher for ₦${amount.toLocaleString()} purchased. Code: ${mockCode}`,
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
      if (!open) {
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
              <Button onClick={handleAddFunds} size="icon" aria-label="Add Funds">
                <CreditCard className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Dailybuy Vouchers
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
