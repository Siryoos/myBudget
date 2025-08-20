const { i18n } = require('./next-i18next.config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  eslint: {
    dirs: ['pages', 'components', 'lib', 'app'],
  },
  i18n: {
    ...i18n,
    localeDetection: false,
  },
}

module.exports = nextConfig
