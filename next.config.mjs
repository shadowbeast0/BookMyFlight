/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:8080'
const staticSite = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true'
const basePath = process.env.PAGES_BASE_PATH || ''

const nextConfig = {
  basePath,
  trailingSlash: staticSite,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(staticSite
    ? { output: 'export' }
    : {
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
        },
      }),
}

export default nextConfig
