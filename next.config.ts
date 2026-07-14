import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Tree-shake the @tcground/ui barrel so importing one component doesn't pull
  // the whole Radix/cmdk graph. (lucide-react is already in Next's default list.)
  experimental: { optimizePackageImports: ['@tcground/ui'] },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.tcgdex.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cards.image.pokemonkorea.co.kr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [320, 384, 640, 750, 828, 1080, 1200],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
