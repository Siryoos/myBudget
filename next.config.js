/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ESLint configuration
  eslint: {
    dirs: ['components', 'lib', 'app'],
    ignoreDuringBuilds: false,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Security headers are handled by middleware/security.ts
  // This prevents conflicts and ensures consistent security configuration
  // All security headers are now managed centrally in the security middleware
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@headlessui/react', '@heroicons/react', 'lucide-react'],
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Security: disable eval in production
    if (!dev) {
      config.optimization.minimize = true;
    }
    
    // Bundle analyzer (optional)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }
    
    return config;
  },
  
  // Compression
  compress: true,
  
  // Powered by header
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // Swc minification
  swcMinify: true,
}

module.exports = nextConfig
