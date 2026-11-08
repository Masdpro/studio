import { defineMachine } from './machine';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const approvalMachine = defineMachine<ApprovalStatus, 'user' | 'admin'>({
  name: 'Role approval',
  description: 'Whether a vendor or delivery-agent role has been checked by an admin and may trade. Each role is approved on its own: an approved vendor who becomes an agent keeps selling while the agent role waits. users.approval_status is the summary (approved only when every role is). Customers are approved from the start.',
  storedIn: 'vendors.approval_status and delivery_agents.approval_status (summary: users.approval_status)',
  initial: ['approved', 'pending'],
  states: {
    pending: { meaning: 'Waiting for an admin to review documents.' },
    approved: { meaning: 'Allowed to trade (customers start here).' },
    rejected: { meaning: 'Needs fixing; the reason is in approval_note on the same row.' },
  },
  transitions: [
    { from: 'approved', to: 'pending', event: 'account adds a vendor or agent profile (the new role starts pending, even if another role is approved)', by: ['user'] },
    { from: ['pending', 'rejected'], to: 'approved', event: 'admin approves', by: ['admin'], checkedElsewhere: ['email, phone (when required) and all of that role’s documents done'] },
    { from: ['pending', 'approved', 'rejected'], to: 'rejected', event: 'admin rejects with a reason (or updates the reason)', by: ['admin'] },
    { from: 'rejected', to: 'pending', event: 'user uploads a document that role needs again (or redoes the live selfie)', by: ['user'] },
  ],
});
