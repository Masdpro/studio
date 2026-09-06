/**
 * Hosts allowed through next/image's optimizer — keep this in sync with
 * `images.remotePatterns` in next.config.ts. Anything else (e.g. a vendor
 * pasting a product photo URL from an arbitrary site) is rendered with
 * SafeImage's plain <img> fallback instead, since next/image throws a hard
 * render error for unconfigured hosts rather than failing soft.
 */
export const ALLOWED_IMAGE_HOSTS = ['placehold.co', 'picsum.photos'];
