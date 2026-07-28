const privateNoStoreHeaders = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
const privateNoIndexHeaders = [...privateNoStoreHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }];
const privatePagePaths = [
  "/admin/:path*",
  "/team/:path*",
  "/dashboard/:path*",
  "/auth/:path*",
  "/login",
  "/player/login",
  "/reset-password",
];
const privateApiPaths = ["/api/admin/:path*", "/api/auth/:path*", "/api/cron/:path*", "/api/team/:path*", "/api/uploads/private/:path*"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      ...privatePagePaths.map((source) => ({ source, headers: privateNoIndexHeaders })),
      ...privateApiPaths.map((source) => ({ source, headers: privateNoStoreHeaders })),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "bravo-gaming-esports-nextjs.vercel.app" },
      { protocol: "https", hostname: "bravo-gaming-esports.vercel.app" },
      { protocol: "https", hostname: "assets.bravogamingesports.com" },
      { protocol: "https", hostname: "hldppfhtkfgthainismr.supabase.co" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};
module.exports = nextConfig;
