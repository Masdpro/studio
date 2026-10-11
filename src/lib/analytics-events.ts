export const EVENT_TYPES = ['page_view', 'product_view', 'search', 'add_to_cart', 'checkout_start', 'order_placed'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
