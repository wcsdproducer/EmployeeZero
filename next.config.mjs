/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  experimental: {
    workerThreads: false,
  },
};
export default nextConfig;
