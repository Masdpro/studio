import { defineMachine } from './machine';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export const paymentMachine = defineMachine<PaymentStatus>({
  name: 'Wallet top-up payment',
  description: 'A Paystack card or transfer payment that adds money to a wallet.',
  storedIn: 'payment_transactions.status',
  initial: 'pending',
  states: {
    pending: { meaning: 'Started on Paystack; not confirmed yet.' },
    success: { meaning: 'Confirmed; the wallet was credited exactly once.', final: true },
    failed: { meaning: 'Paystack said it failed or was abandoned.' },
  },
  transitions: [
    { from: 'pending', to: 'success', event: 'Paystack confirms (callback, polling or webhook)' },
    { from: 'pending', to: 'failed', event: 'Paystack reports failure' },
    { from: 'failed', to: 'success', event: 'Paystack later confirms it went through' },
  ],
});
