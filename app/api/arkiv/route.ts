import { getCurrentUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { buildArchive } from "@/lib/store/archive";
import { UserError } from "@/lib/store/access";

export const maxDuration = 300;

/** The archive of old plans as a ZIP (superadmin). */
export async function GET() {
  const cur = await getCurrentUser();
  if (!cur.ok) return new Response("Ikke innlogget", { status: 401 });
  const user = cur.user;
  if (!user.rights.superadmin) return new Response("Bare superadmin kan laste ned arkivet.", { status: 403 });
  try {
    const names = Object.fromEntries(user.data.groups.map((g) => [g.id, g.name]));
    const a = await buildArchive(await db(), user.access, user.rights, names);
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date());
    return new Response(new Uint8Array(a.zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="nymark-arkiv-${date}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof UserError) return new Response(err.message, { status: 404 });
    throw err;
  }
}
