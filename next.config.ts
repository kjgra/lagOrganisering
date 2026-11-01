import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie, so the app is dynamic anyway.
  // Cache Components would only add Suspense requirements.
  cacheComponents: false,
  // PGlite (simulated database) and react-pdf ship their own assets; keep them as Node packages.
  serverExternalPackages: ["@electric-sql/pglite", "@react-pdf/renderer"],
  poweredByHeader: false,
  // Security headers on every response. No CSP yet: Next.js inline scripts need nonces.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
  // The e2e tests run their own dev server next to `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Tailwind CSS v4 through its Turbopack loader (no PostCSS config needed).
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  // The simulated database runs the SQL migrations at start-up; «Hva er nytt» reads CHANGELOG.md.
  outputFileTracingIncludes: { "/**": ["./supabase/migrations/*.sql", "./lib/pdf/fonts/*.ttf", "./CHANGELOG.md"] },
};

export default nextConfig;
