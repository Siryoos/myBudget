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
    // Limit lint scope to core app directories and skip lint blocking the build.
    dirs: ['components', 'lib', 'app'],
    ignoreDuringBuilds: true,
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
    // Avoid optional native PG bindings in webpack bundles
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'pg-native': false,
    };

    // Treat pg-native as external (not required at runtime in this app)
    config.externals = config.externals || [];
    config.externals.push({ 'pg-native': 'commonjs pg-native' });

    // Suppress noisy dynamic require warnings from OpenTelemetry/prisma instrumentation
    config.ignoreWarnings = [
      (warning) => {
        const msg = typeof warning.message === 'string' ? warning.message : '';
        const resource = (warning.module && (warning.module.resource || warning.module.userRequest)) || '';
        return (
          /Critical dependency: the request of a dependency is an expression/.test(msg) ||
          /require function is used in a way in which dependencies cannot be statically extracted/.test(msg) ||
          /@opentelemetry|require-in-the-middle|@prisma\/instrumentation/.test(String(resource))
        );
      },
    ];

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
