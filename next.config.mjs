/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Capacitor static export (requires removing API routes or hosting them separately)
  // output: 'export',
  // trailingSlash: true,
  // images: { unoptimized: true },

  // For development with Capacitor (using local server)
  // Run: npx cap run android -l --external
  // Then set capacitor.config.ts server.url to your local IP:3001

  // React 19 + Next.js 16 compatibility
  reactStrictMode: true,

  // Experimental features for better mobile performance
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },

  // Allow cross-origin requests for Capacitor
  allowedDevOrigins: ['*.capacitor.app', '*.ionic.io', 'localhost'],
};

export default nextConfig;