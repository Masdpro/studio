export const when = (d: string | number | Date) => {
  const date = new Date(d);
  return date.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
};
export const day = (d: string | number | Date) => new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
export const ago = (d: string | number | Date) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return day(d);
};

/** Order status words and colours (same wording as the website). */
export const ORDER_STATUS: Record<string, { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }> = {
  Pending: { label: 'Waiting for the shop', tone: 'warn' },
  Processing: { label: 'Being prepared', tone: 'info' },
  ReadyForPickup: { label: 'Waiting for a rider', tone: 'info' },
  ReadyForCustomerPickup: { label: 'Ready to collect', tone: 'good' },
  PickedUpByCustomer: { label: 'Collected', tone: 'good' },
  AcceptedByAgent: { label: 'Rider heading to shop', tone: 'info' },
  PickedUpByAgent: { label: 'On the way', tone: 'info' },
  'Out for Delivery': { label: 'On the way', tone: 'info' },
  Delivered: { label: 'Delivered', tone: 'good' },
  Cancelled: { label: 'Cancelled', tone: 'bad' },
};
export const orderStatus = (s: string) => ORDER_STATUS[s] ?? { label: s.replace(/([a-z])([A-Z])/g, '$1 $2'), tone: 'neutral' as const };

export const BOOKING_STATUS: Record<string, { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }> = {
  Requested: { label: 'Waiting for reply', tone: 'warn' },
  Confirmed: { label: 'Confirmed', tone: 'good' },
  Completed: { label: 'Completed', tone: 'neutral' },
  Declined: { label: 'Declined', tone: 'bad' },
  Expired: { label: 'No reply, refunded', tone: 'bad' },
  Cancelled: { label: 'Cancelled', tone: 'bad' },
  NoShow: { label: 'Missed', tone: 'bad' },
};


export const duration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);


export const ERRAND_STATUS: Record<string, { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }> = {
  PendingQuotes: { label: 'Waiting for quotes', tone: 'warn' },
  AwaitingAcceptance: { label: 'Quotes in: choose one', tone: 'info' },
  AgentAssigned: { label: 'Rider on it', tone: 'good' },
  InProgress: { label: 'Shopping', tone: 'good' },
  OutForDelivery: { label: 'On the way', tone: 'good' },
  Delivered: { label: 'Delivered', tone: 'good' },
  CancelledByCustomer: { label: 'Cancelled', tone: 'bad' },
  CancelledByAgent: { label: 'Cancelled by rider', tone: 'bad' },
  Expired: { label: 'Expired', tone: 'bad' },
};

