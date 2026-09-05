import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shzyvrojbtbczqqoilip.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "eetuijxhkpaqggegppek.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Dashboard navigations reuse already-visited dynamic pages briefly, so
    // switching between member/board screens is instant instead of refetching.
    staleTimes: {
      dynamic: 30,
    },
    serverActions: {
      // Large media goes directly to a private signed-upload bucket. Server
      // Actions now carry only small form data and metadata.
      bodySizeLimit: "1mb",
    },
    // Keep shared styles cacheable across routes. Experimental inlineCss in
    // 16.3.1 crashes cold streamed mobile navigation (React stylesheet #137).
    inlineCss: false,
  },
};

export default nextConfig;
