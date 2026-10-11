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
    // The worker file itself must never be cached, or updates to it would never reach users.
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }];
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
