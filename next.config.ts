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
  // Reverse proxy PostHoga przez własną domenę (region EU). Ruch analityki i
  // nagrań idzie przez `/ingest`, a nie przez `*.i.posthog.com` — dzięki temu
  // adblockery/uBlock nie ucinają zdarzeń, pageview'ów ani session replay.
  // Klient wskazuje `api_host: "/ingest"` (patrz PostHogProvider).
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Statyczne bundle posthog-js (array.js, recorder.js, surveys…).
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      // Zdarzenia, flagi (`/flags`, `/decide`), nagrania, itd.
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // STT używa mikrofonu (self); reszta wyłączona.
            value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
