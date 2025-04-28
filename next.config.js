/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
        pathname: '/**',
      },
      // Block for Spotify images
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify's image CDN
        pathname: '/image/**', // Allow any path under /image/
      },
      // Block for Google images
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google's image CDN
        pathname: '/a/**', // Allow any path under /image/
      },
    ],
  },
  experimental: {
    nodeMiddleware: true,
  },
}

module.exports = nextConfig;