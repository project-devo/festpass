import type { NextConfig } from "next";

// Where Vercel forwards /api/* requests. Set API_ORIGIN on Vercel to the Render URL.
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Browser calls /api/events on our own domain, Vercel fetches apiOrigin/events.
  // Same site for the browser, so Safari keeps the login cookie.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;