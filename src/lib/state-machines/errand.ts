import { defineMachine } from './machine';
import type { ErrandQuoteStatus, ErrandRequestStatus } from '@/lib/types';

export const errandMachine = defineMachine<ErrandRequestStatus, 'customer' | 'agent'>({
  name: 'Errand request',
  description: 'A customer asks delivery agents to buy and bring items; agents quote and the customer picks one.',
  storedIn: 'errand_requests.status',
  initial: 'PendingQuotes',
  states: {
    PendingQuotes: { meaning: 'Waiting for agents to send quotes.' },
    AwaitingAcceptance: { meaning: 'At least one quote arrived; the customer picks one.' },
    AgentAssigned: { meaning: 'The customer accepted a quote; that agent does the errand.' },
    InProgress: { meaning: 'Agent is shopping.', planned: true },
    OutForDelivery: { meaning: 'Agent is bringing the items.', planned: true },
    Delivered: { meaning: 'Errand completed.', planned: true, final: true },
    CancelledByCustomer: { meaning: 'Customer cancelled.', planned: true, final: true },
    CancelledByAgent: { meaning: 'Agent cancelled.', planned: true, final: true },
    Expired: { meaning: 'Nobody quoted or no quote accepted in time.', planned: true, final: true },
  },
  transitions: [
    { from: 'PendingQuotes', to: 'AwaitingAcceptance', event: 'first quote arrives', by: ['agent'], checkedElsewhere: ['agent is verified and approved'] },
    { from: 'AwaitingAcceptance', to: 'AgentAssigned', event: 'customer accepts a quote', by: ['customer'], checkedElsewhere: ['quote is still Pending'] },
  ],
});

export const errandQuoteMachine = defineMachine<ErrandQuoteStatus>({
  name: 'Errand quote',
  description: "One agent's price for an errand.",
  storedIn: 'errand_quotes.status',
  initial: 'Pending',
  states: {
    Pending: { meaning: 'Waiting for the customer.' },
    Accepted: { meaning: 'The customer chose this quote.', final: true },
    Rejected: { meaning: 'The customer chose another quote.', final: true },
    Expired: { meaning: 'Timed out.', planned: true, final: true },
    Withdrawn: { meaning: 'The agent took it back.', planned: true, final: true },
  },
  transitions: [
    { from: 'Pending', to: 'Accepted', event: 'customer accepts this quote' },
    { from: 'Pending', to: 'Rejected', event: 'customer accepts another quote' },
  ],
});

/** Errands an agent may still quote on. */
export const ERRAND_OPEN_FOR_QUOTES: readonly ErrandRequestStatus[] = ['PendingQuotes', 'AwaitingAcceptance'];
