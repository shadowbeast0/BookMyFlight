/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:8080'

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}

export default nextConfig
