import type { NextConfig } from 'next';
import path from 'path';

/** Origin of the backend API that serves locally stored /uploads images. */
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').origin;
  } catch {
    return 'http://localhost:5001';
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Absolute /uploads URLs from the production API
      { protocol: 'https', hostname: 'api.singarisaree.com' },
      { protocol: 'http', hostname: 'localhost', port: '5001' },
      { protocol: 'http', hostname: '127.0.0.1', port: '5001' },
      // Legacy images uploaded before the switch to local storage still live on Cloudinary.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Proxy locally stored images from the backend so relative "/uploads/*" paths
  // (returned by the API) load from the same origin as the storefront.
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'react-icons',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
