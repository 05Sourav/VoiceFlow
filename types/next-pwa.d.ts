declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp | string;
      handler: string;
      options?: {
        cacheName?: string;
        [key: string]: any;
      };
    }>;
    [key: string]: any;
  }

  function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export default withPWA;
} 