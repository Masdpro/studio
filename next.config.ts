import type {NextConfig} from 'next';
import { ALLOWED_IMAGE_HOSTS } from './src/lib/image-hosts';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
      pathname: '/**',
    })),
  },
};

export default nextConfig;
