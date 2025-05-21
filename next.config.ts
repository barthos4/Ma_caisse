
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Added for Supabase Storage (adjust if your Supabase URL pattern is different)
        protocol: 'https',
        hostname: '*.supabase.co', // Allows any subdomain of supabase.co
        port: '',
        pathname: '/**',
      },
      { // Added to allow images from Canva, as indicated by the error
        protocol: 'https',
        hostname: 'www.canva.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Optional: adjust if needed
    },
  },
};

export default nextConfig;
