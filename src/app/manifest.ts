import type { MetadataRoute } from 'next';

/** Lets phones install Closebuy from the browser, and gives the mobile app its name, colours and icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Closebuy',
    short_name: 'Closebuy',
    description: 'Shop from nearby stores and book local services, delivered to you.',
    id: '/',
    start_url: '/shop',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f5db',
    theme_color: '#ff8f66',
    categories: ['shopping', 'lifestyle', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
