
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // Il est fortement recommandé de résoudre les erreurs TypeScript avant le déploiement.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    // Configuration des domaines autorisés pour next/image
    // Assurez-vous que tous les hostnames d'images externes sont listés ici.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Pour les images stockées dans Supabase Storage
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.canva.com', // Si vous utilisez des images de Canva
        port: '',
        pathname: '/**',
      },
      // Ajoutez d'autres domaines si nécessaire
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Si vous n'utilisez pas de sortie statique explicite et que vous déployez sur Vercel/Netlify,
  // vous n'avez généralement pas besoin de output: 'export'.
  // output: 'export', // Décommentez si vous faites un export statique pour certains hébergeurs.
};

export default nextConfig;
