/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '15mb' }
  },
  webpack: (config) => {
    // pdf-parse ships a debug entry that tries to read a local test file at
    // import time in some bundling contexts; keep it external on the server.
    return config;
  }
};

export default nextConfig;
