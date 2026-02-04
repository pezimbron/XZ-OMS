import path from 'path'
import { fileURLToPath } from 'url'
import { withPayload } from '@payloadcms/next/withPayload'

import redirects from './redirects.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
    ],
  },
  reactStrictMode: true,
  redirects,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Stub image-size since we don't use image uploads
      config.resolve.alias = {
        ...config.resolve.alias,
        'image-size/fromFile': false,
        'image-size': false,
      }
    }
    return config
  },
}

export default withPayload(nextConfig)
