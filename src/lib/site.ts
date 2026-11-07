// Public business details shown on the website (landing page, footer, contact and policy pages).
// Change them here and every page updates.
export const SITE = {
  name: 'Closebuy',
  url: 'https://cbuyapp.com',
  tagline: 'Shop from trusted vendors close to you.',
  supportEmail: 'support@cbuyapp.com',
  phone: '+234 812 806 4945',
  phoneHref: 'tel:+2348128064945',
  whatsappHref: 'https://wa.me/2348128064945',
  address: ['29 Lawani Street, Onike', 'Lagos Mainland, Lagos', 'Nigeria'],
  deliveryFee: 1500,
  policiesUpdated: '7 November 2026',
} as const;

/** Where the marketplace lives now that "/" is the public landing page. */
export const SHOP_PATH = '/shop';
