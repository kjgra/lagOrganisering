import type { Instrumentation } from "next";

const AREAS: Record<string, string> = { render: "Visning av side", route: "API", action: "Handling", proxy: "Proxy" };

/**
 * Errors Next.js catches itself (a page, a route or a Server Action that
 * throws) go to the error log too. The route is the template
 * (/g/[groupId]/…), never the real ids.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, _request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest === "string" && digest.startsWith("NEXT_")) return;
  const { reportError } = await import("@/lib/errors");
  await reportError(AREAS[context.routeType] ?? "Forespørsel", err, { route: context.routePath });
};
