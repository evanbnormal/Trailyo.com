/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  // Exclude src/pages directory from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { isServer, dev }) => {
    // Exclude React Router pages from the build
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Exclude React Router pages
        '@/pages': false,
      };
    }
    return config;
  },
};

export default nextConfig; 