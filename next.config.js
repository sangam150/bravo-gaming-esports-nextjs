/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "bravo-gaming-esports-nextjs.vercel.app" },
      { protocol: "https", hostname: "bravo-gaming-esports.vercel.app" },
      { protocol: "https", hostname: "assets.bravogamingesports.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};
module.exports = nextConfig;
