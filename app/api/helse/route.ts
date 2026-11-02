import { APP_VERSION } from "@/lib/changelog-file";
import { db } from "@/lib/db";
import { reportError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Health check for the workflow «Påminnelser» (every 15 minutes): the app
 * answers and reaches the database. Only the version is shown, nothing else.
 */
export async function GET() {
  try {
    const d = await db();
    await Promise.race([d.query("SELECT 1"), new Promise((_, reject) => setTimeout(() => reject(new Error("Databasen svarte ikke på 10 sekunder")), 10_000))]);
    return Response.json({ ok: true, versjon: APP_VERSION }, { headers: NO_STORE });
  } catch (err) {
    await reportError("Helsesjekk", err);
    return Response.json({ ok: false, versjon: APP_VERSION }, { status: 503, headers: NO_STORE });
  }
}
