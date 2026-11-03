import { getCurrentUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { UserError } from "@/lib/store/access";
import { personExport } from "@/lib/personal-export";

/** Everything stored about one person, as JSON (superadmin, for a request for access). */
export async function GET(req: Request) {
  const cur = await getCurrentUser();
  if (!cur.ok) return new Response("Ikke innlogget", { status: 401 });
  const user = cur.user;
  if (!user.rights.superadmin) return new Response("Bare superadmin kan laste ned personopplysninger.", { status: 403 });
  const url = new URL(req.url);
  const groupId = url.searchParams.get("lag") ?? "";
  const memberId = url.searchParams.get("person") ?? "";
  const group = user.data.groups.find((g) => g.id === groupId);
  const member = group?.members.find((m) => m.id === memberId);
  if (!group || !member) return new Response("Fant ikke personen.", { status: 404 });
  try {
    const data = await personExport(await db(), user, group, member);
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date());
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="personopplysninger-${date}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof UserError) return new Response(err.message, { status: 404 });
    throw err;
  }
}
