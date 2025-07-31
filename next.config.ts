import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Disable PWA in development to avoid conflicts
  runtimeCaching: [
    {
      urlPattern: /^\/models\/whisper\/.*/,
      handler: 'CacheFirst',
      options: { cacheName: 'whisper-models' },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig) as NextConfig;