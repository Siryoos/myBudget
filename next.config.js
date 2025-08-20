/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [],
  },
  eslint: {
    dirs: ['pages', 'components', 'lib', 'app'],
  },
}

module.exports = nextConfig
