import type {NextConfig} from 'next';
import { ALLOWED_IMAGE_HOSTS } from './src/lib/image-hosts';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.app.github.dev'],
    },
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    // Defence-in-depth response headers on every route. These are the safe,
    // non-breaking ones. A full Content-Security-Policy is added in
    // report-only mode below: it blocks nothing yet, but logs what a strict
    // policy *would* block, so you can tighten it to enforcing later without
    // risking the app. The camera/geolocation permissions stay enabled for
    // the live selfie check and order tracking.
    const securityHeaders = [
      // Force HTTPS for two years. Add `; preload` and submit to hstspreload.org
      // only once every subdomain is HTTPS — preload is hard to undo.
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Frame-Options', value: 'DENY' }, // no one may frame our pages (clickjacking)
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self), browsing-topics=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // keeps the Paystack popup working
      {
        key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          // Next.js injects inline/eval scripts; keep these until a nonce-based policy is in place.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "media-src 'self' data: blob: https:",
          // Cloudflare Turnstile (sign-up bot check) loads from challenges.cloudflare.com.
          // Live selfie model files (self-hosted, with Google's copy as a fallback) + Paystack + maps geocoding.
          "connect-src 'self' https://storage.googleapis.com https://api.paystack.co https://nominatim.openstreetmap.org https://challenges.cloudflare.com",
          "worker-src 'self' blob:",
          "frame-src 'self' https://checkout.paystack.com https://challenges.cloudflare.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join('; '),
      },
    ];
    return [
      { source: '/:path*', headers: securityHeaders },
      // The worker file itself must never be cached, or updates to it would never reach users.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
  images: {
    minimumCacheTTL: 60 * 60 * 24, // optimized images are reused for a day; the worker revalidates in the background
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
      pathname: '/**',
    })),
  },
};

export default nextConfig;
