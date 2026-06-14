/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  experimental: {
    workerThreads: false,
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production"}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};
export default nextConfig;
