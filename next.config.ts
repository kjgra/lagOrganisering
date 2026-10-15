import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie, so the app is dynamic anyway.
  // Cache Components would only add Suspense requirements.
  cacheComponents: false,
  // PGlite (simulated database) and react-pdf ship their own assets; keep them as Node packages.
  serverExternalPackages: ["@electric-sql/pglite", "@react-pdf/renderer"],
  poweredByHeader: false,
  // The e2e tests run their own dev server next to `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Tailwind CSS v4 through its Turbopack loader (no PostCSS config needed).
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  // The simulated database runs the SQL migrations at start-up.
  outputFileTracingIncludes: { "/**": ["./supabase/migrations/*.sql", "./lib/pdf/fonts/*.ttf"] },
};

export default nextConfig;
