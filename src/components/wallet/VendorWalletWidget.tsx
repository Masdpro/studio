
'use client';

import { useState, useEffect } from 'react';
import { Wallet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// In a real app, this would come from a vendor's specific data
const INITIAL_VENDOR_BALANCE = 500.00;

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

export function VendorWalletWidget() {
  const [balance, setBalance] = useState(INITIAL_VENDOR_BALANCE);
  const [withdrawAmount, setWithdrawAmount] = useState(''); // Stores raw numeric string
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    // Potentially load balance from localStorage or API
  }, []);

  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);

    if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
       if (numericValue.split('.').length <= 2) {
        setWithdrawAmount(numericValue);
      }
    }
  };

  const handleWithdrawFunds = () => {
    const amount = parseFloat(withdrawAmount); // withdrawAmount is already unformatted
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount to withdraw.',
        variant: 'destructive',
      });
      return;
    }
    if (amount > balance) {
      toast({
        title: 'Insufficient Funds',
        description: 'You do not have enough funds to withdraw this amount.',
        variant: 'destructive',
      });
      return;
    }
    setBalance((prev) => prev - amount);
    toast({
      title: 'Withdrawal Initiated!',
      description: `$${amount.toFixed(2)} has been processed for withdrawal.`,
    });
    setWithdrawAmount('');
  };

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Vendor Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading wallet balance...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Your Wallet
        </CardTitle>
        <CardDescription>Manage your earnings and withdrawals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
          <p className="text-4xl font-bold text-primary">${balance.toFixed(2)}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">Withdraw Funds</Label>
          <div className="flex items-center gap-2">
            <Input
              id="withdraw-amount"
              type="text" // Changed from number to text
              placeholder="Amount (e.g., 5,000.00)"
              value={formatNumberWithCommas(withdrawAmount)}
              onChange={handleWithdrawAmountChange}
              className="flex-1 h-11"
            />
            <Button onClick={handleWithdrawFunds} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Download className="mr-2 h-5 w-5" /> Withdraw
            </Button>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Transaction History (Coming Soon)</h4>
          <p className="text-sm text-muted-foreground">
            A list of your recent transactions will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
