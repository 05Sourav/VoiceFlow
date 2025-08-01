import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Only disable in development
  sw: '/sw.js', // Use our custom service worker
  runtimeCaching: [
    {
      urlPattern: /^\/api\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache' },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'image-cache' },
    },
    {
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-resources' },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['next-pwa'],
  },
};

export default withPWA(nextConfig) as NextConfig;