
'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

// In a real app, this would come from a user context or API
const INITIAL_BALANCE = 100.00;

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
  const [addAmount, setAddAmount] = useState(''); // Stores raw numeric string
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    // Potentially load balance from localStorage here if persisting
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
    const amount = parseFloat(addAmount); // addAmount is already unformatted
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
      description: `$${amount.toFixed(2)} has been added to your wallet.`,
    });
    setAddAmount('');
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-semibold">${balance.toFixed(2)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">My Wallet</h4>
            <p className="text-sm text-muted-foreground">
              Your current account balance.
            </p>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">${balance.toFixed(2)}</CardTitle>
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
                type="text" // Changed from number to text
                placeholder="Amount (e.g., 1,000.00)"
                value={formatNumberWithCommas(addAmount)}
                onChange={handleAddAmountChange}
                className="flex-1"
              />
              <Button onClick={handleAddFunds} size="icon" aria-label="Add Funds">
                <CreditCard className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
