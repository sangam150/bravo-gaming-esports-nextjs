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

const configuredPublicImageRemotePattern = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
      return null;
    }
    const basePath = parsedUrl.pathname.replace(/\/+$/g, "");
    return {
      protocol: "https",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      pathname: basePath ? `${basePath}/**` : "/**",
    };
  } catch {
    return null;
  }
})();

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
      {
        source: "/overlay/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // The managed public-upload route validates and normalizes its `key` query
    // before reading storage. Next 16 requires local image query strings to be
    // explicitly allowlisted, so keep this exception scoped to that route.
    localPatterns: [{ pathname: "/images/**", search: "" }, { pathname: "/api/uploads/r2" }],
    remotePatterns: [
      { protocol: "https", hostname: "bravo-gaming-esports-nextjs.vercel.app" },
      { protocol: "https", hostname: "bravo-gaming-esports.vercel.app" },
      { protocol: "https", hostname: "assets.bravogamingesports.com" },
      { protocol: "https", hostname: "hldppfhtkfgthainismr.supabase.co" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      ...(configuredPublicImageRemotePattern ? [configuredPublicImageRemotePattern] : []),
    ],
  },
};
module.exports = nextConfig;
