/**
 * Every status workflow in Closebuy, written down as data. Start here when changing what can
 * happen to an order, booking, payout, payment, errand or account. See docs/state-machines.md for diagrams.
 */
export * from './machine';
export * from './order';
export * from './withdrawal';
export * from './payment';
export * from './errand';
export * from './approval';
export * from './booking';

import { orderMachine } from './order';
import { withdrawalMachine } from './withdrawal';
import { paymentMachine } from './payment';
import { errandMachine, errandQuoteMachine } from './errand';
import { approvalMachine } from './approval';
import { bookingMachine } from './booking';

export const ALL_MACHINES = [orderMachine, withdrawalMachine, paymentMachine, errandMachine, errandQuoteMachine, approvalMachine, bookingMachine];
