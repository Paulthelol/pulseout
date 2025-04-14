/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
        pathname: '/**',
      },
      // Add this block for Spotify images
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify's image CDN
        pathname: '/image/**', // Allow any path under /image/
      },
    ],
  },
  experimental: {
    nodeMiddleware: true,
  },
}

module.exports = nextConfig;