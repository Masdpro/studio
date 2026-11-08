import { defineMachine } from './machine';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const approvalMachine = defineMachine<ApprovalStatus, 'user' | 'admin'>({
  name: 'Account approval',
  description: 'Whether a vendor or delivery agent has been checked by an admin and may trade. Customers are approved from the start.',
  storedIn: 'users.approval_status',
  initial: ['approved', 'pending'],
  states: {
    pending: { meaning: 'Waiting for an admin to review documents.' },
    approved: { meaning: 'Allowed to trade (customers start here).' },
    rejected: { meaning: 'Needs fixing; the reason is in users.approval_note.' },
  },
  transitions: [
    { from: 'approved', to: 'pending', event: 'customer adds their first vendor or agent profile', by: ['user'] },
    { from: ['pending', 'rejected'], to: 'approved', event: 'admin approves', by: ['admin'], checkedElsewhere: ['email, phone (when required) and all documents done'] },
    { from: ['pending', 'approved', 'rejected'], to: 'rejected', event: 'admin rejects with a reason (or updates the reason)', by: ['admin'] },
    { from: 'rejected', to: 'pending', event: 'user uploads a document again', by: ['user'] },
  ],
});
