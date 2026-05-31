import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql z file: URL wymaga natywnych bindingów — Vercel musi je
  // ładować w runtime, nie bundlować przez Turbopack.
  serverExternalPackages: ["@libsql/client", "libsql"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
