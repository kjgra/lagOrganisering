import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie, so the app is dynamic anyway.
  // Cache Components would only add Suspense requirements.
  cacheComponents: false,
  // PGlite (simulated database) and react-pdf ship their own assets; keep them as Node packages.
  serverExternalPackages: ["@electric-sql/pglite", "@react-pdf/renderer"],
  poweredByHeader: false,
  // The simulated database runs the SQL migrations at start-up.
  outputFileTracingIncludes: { "/**": ["./supabase/migrations/*.sql"] },
};

export default nextConfig;
