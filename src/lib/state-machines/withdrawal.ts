import { defineMachine } from './machine';

export type WithdrawalStatus = 'awaiting_approval' | 'awaiting_otp' | 'pending' | 'success' | 'failed' | 'reversed' | 'rejected';

export const withdrawalMachine = defineMachine<WithdrawalStatus, 'owner' | 'admin'>({
  name: 'Withdrawal',
  description: 'A vendor or agent moving earnings from their Closebuy wallet to their bank, approved by an admin.',
  storedIn: 'withdrawals.status',
  initial: 'awaiting_approval',
  states: {
    awaiting_approval: { meaning: 'Money held from the wallet; waiting for an admin.' },
    pending: { meaning: 'Sent to Paystack; waiting for the bank.' },
    awaiting_otp: { meaning: 'Paystack wants the OTP it sent the admin.' },
    success: { meaning: 'Paid into the bank account.' },
    failed: { meaning: 'Paystack or the bank refused it; money back in the wallet.', final: true },
    reversed: { meaning: 'The bank sent it back; money back in the wallet.', final: true },
    rejected: { meaning: 'An admin declined it; money back in the wallet.', final: true },
  },
  transitions: [
    { from: 'awaiting_approval', to: 'pending', event: 'admin approves (transfer starts)', by: ['admin'], checkedElsewhere: ['account not suspended', 'bank account still on file'] },
    { from: 'awaiting_approval', to: 'rejected', event: 'admin declines', by: ['admin'] },
    { from: 'pending', to: 'awaiting_otp', event: 'Paystack asks for an OTP' },
    { from: 'awaiting_otp', to: 'pending', event: 'admin enters the OTP', by: ['admin'] },
    { from: 'awaiting_otp', to: 'rejected', event: 'admin declines', by: ['admin'] },
    { from: ['pending', 'awaiting_otp'], to: 'success', event: 'Paystack confirms (webhook or re-check)' },
    { from: ['pending', 'awaiting_otp'], to: 'failed', event: 'Paystack fails it (webhook, re-check or refused)' },
    { from: ['pending', 'awaiting_otp', 'success'], to: 'reversed', event: 'the bank reverses it' },
  ],
});

/** A withdrawal in one of these blocks the owner from starting another. */
export const WITHDRAWAL_OPEN: readonly WithdrawalStatus[] = ['awaiting_approval', 'awaiting_otp', 'pending'];
