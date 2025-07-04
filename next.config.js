/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': new URL('./src', import.meta.url).pathname,
    };
    return config;
  },
  images: {
    domains: ['images.unsplash.com', 'api.microlink.io'],
  },
}

export default nextConfig 