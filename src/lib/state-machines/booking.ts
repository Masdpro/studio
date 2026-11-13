import { defineMachine } from './machine';

export type BookingStatus = 'Requested' | 'Confirmed' | 'Completed' | 'Declined' | 'Expired' | 'Cancelled' | 'NoShow';

/** Who is making the move. */
export type BookingActor = 'customer' | 'vendor' | 'admin';

export const bookingMachine = defineMachine<BookingStatus, BookingActor>({
  name: 'Booking',
  description: 'A customer booking a vendor\'s service for a time slot. Paid upfront from the wallet and held by Closebuy until the job is done.',
  storedIn: 'bookings.status',
  initial: ['Requested', 'Confirmed'],
  states: {
    Requested: { meaning: 'Paid and waiting for the vendor to accept (vendors who approve each booking). Lapses after 4 hours, or 1 hour before the slot.' },
    Confirmed: { meaning: 'The slot is booked. The customer has a 4-digit code to give the vendor when the job is done.' },
    Completed: { meaning: 'The vendor entered the customer\'s code. The vendor is paid.', final: true },
    Declined: { meaning: 'The vendor turned the request down. Refunded in full.', final: true },
    Expired: { meaning: 'The vendor didn\'t answer in time. Refunded in full.', final: true },
    Cancelled: { meaning: 'Cancelled. Full refund, except a customer cancelling within 24 hours of the slot: the vendor keeps 50%.', final: true },
    NoShow: { meaning: 'The customer didn\'t turn up. The vendor keeps 50%; the rest is refunded.', final: true },
  },
  transitions: [
    { from: 'Requested', to: 'Confirmed', event: 'vendor accepts the request', by: ['vendor'], checkedElsewhere: ['the slot is still free'] },
    { from: 'Requested', to: 'Declined', event: 'vendor declines the request', by: ['vendor'] },
    { from: 'Requested', to: 'Expired', event: 'the vendor didn\'t answer in time (timer)' },
    { from: ['Requested', 'Confirmed'], to: 'Cancelled', event: 'customer cancels (free until 24 hours before)', by: ['customer'] },
    { from: 'Confirmed', to: 'Cancelled', event: 'vendor cancels (full refund)', by: ['vendor'] },
    { from: 'Confirmed', to: 'Completed', event: 'vendor enters the customer\'s code', by: ['vendor'], checkedElsewhere: ['correct code (5 tries)', 'from 30 minutes before the start'] },
    { from: 'Confirmed', to: 'NoShow', event: 'vendor marks the customer as a no-show', by: ['vendor'], checkedElsewhere: ['at least 15 minutes after the start'] },
    { from: ['Requested', 'Confirmed'], to: 'Cancelled', event: 'support cancels with a reason (refunds in full)', by: ['admin'] },
    { from: 'Confirmed', to: 'Completed', event: 'support settles a finished job the vendor couldn\'t close (pays the vendor)', by: ['admin'] },
  ],
});

/** Bookings that hold a slot. */
export const BOOKING_ACTIVE: readonly BookingStatus[] = ['Requested', 'Confirmed'];
