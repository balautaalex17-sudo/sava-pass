import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shzyvrojbtbczqqoilip.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    // Inline the (small, atomic Tailwind) CSS into <style> tags instead of a
    // render-blocking <link> (perf: PageSpeed "render-blocking requests", ~300ms off
    // FCP/LCP). Homepage CSS is tiny and first-load perf is the goal here.
    inlineCss: true,
  },
};

export default nextConfig;
