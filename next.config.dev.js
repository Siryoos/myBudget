/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development-specific configuration
  env: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_NODE_ENV: 'development',
  },

  // Enhanced development features
  experimental: {
    // Enable Turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },

    // Enable app directory features
    appDir: true,

    // Enable faster builds
    optimizeCss: true,
    optimizePackageImports: [
      '@headlessui/react',
      '@heroicons/react',
      'lucide-react',
      'recharts',
      'react-hook-form',
      'date-fns'
    ],

    // Enable Webpack build worker
    webpackBuildWorker: true,

    // Enable faster refresh
    swcMinify: false, // Disable in development for faster builds
  },

  // Development server configuration
  devServer: {
    // Enable hot reload
    hot: true,

    // Enable live reload
    liveReload: true,

    // Enable overlay for errors
    overlay: {
      errors: true,
      warnings: false,
    },

    // Development headers
    headers: {
      'X-Dev-Server': 'SmartSave Development',
      'X-Dev-Turbo': 'enabled',
      'X-Dev-Hot-Reload': 'enabled',
    },
  },

  // Image optimization (development settings)
  images: {
    // Allow local images
    domains: ['localhost'],

    // Disable optimization in development for faster builds
    unoptimized: false,

    // Enable formats
    formats: ['image/webp', 'image/avif'],

    // Cache settings for development
    minimumCacheTTL: 60,

    // Allow SVG
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration for development
  webpack: (config, { dev, isServer }) => {
    // Development-specific webpack configuration
    if (dev) {
      // Enable source maps for better debugging
      config.devtool = 'eval-source-map';

      // Add development plugins
      if (!isServer) {
        // Bundle analyzer (optional)
        if (process.env.ANALYZE === 'true') {
          const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'server',
              openAnalyzer: true,
            })
          );
        }
      }

      // Add custom webpack rules for development
      config.module.rules.push({
        test: /\.svg$/i,
        use: ['@svgr/webpack'],
      });

      // Development-specific aliases
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
        '~': require('path').resolve(__dirname),
        '@components': require('path').resolve(__dirname, 'components'),
        '@lib': require('path').resolve(__dirname, 'lib'),
        '@styles': require('path').resolve(__dirname, 'styles'),
        '@types': require('path').resolve(__dirname, 'types'),
        '@utils': require('path').resolve(__dirname, 'lib/utils'),
        '@config': require('path').resolve(__dirname, 'config'),
      };
    }

    // Common webpack optimizations
    config.optimization = {
      ...config.optimization,
      // Enable module concatenation for better performance
      concatenateModules: true,
      // Enable split chunks for better caching
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

  // ESLint configuration for development
  eslint: {
    dirs: ['components', 'lib', 'app', 'pages'],
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },

  // Headers for development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Dev-API',
            value: 'SmartSave Development API',
          },
        ],
      },
    ];
  },

  // Rewrites for development
  async rewrites() {
    return [
      // API documentation redirect
      {
        source: '/docs',
        destination: '/api/docs',
      },
      // Health check redirect
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },

  // Development-specific redirects
  async redirects() {
    return [
      // Redirect old paths to new ones (for development compatibility)
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: false,
      },
    ];
  },

  // Compression
  compress: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // React strict mode (enabled for development)
  reactStrictMode: true,

  // SWC configuration
  swcMinify: false, // Disabled in development for faster builds

  // Output configuration
  output: 'standalone',

  // Generate build ID
  generateBuildId: async () => {
    return `smartsave-dev-${Date.now()}`;
  },

  // On-demand entries (for development)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;
