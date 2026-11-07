import { z } from "zod";
import { BANK_VIEWS, asBankReader, bankReadToken, isBankReader, readBank } from "@/lib/bank-read";
import { reportError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const query = z.object({
  del: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((x) => x.trim()) : [...BANK_VIEWS]))
    .pipe(z.array(z.enum(BANK_VIEWS)).min(1).max(BANK_VIEWS.length)),
});

/**
 * The exercise bank and its improvement material, read-only, for Claude.
 * `Authorization: Bearer <BANK_READ_TOKEN>`; `?del=ovelser,evalueringer`
 * picks views (default all). No players, tags, levels or person ids: see
 * lib/bank-read.ts and docs/publisering.md §12.
 */
export async function GET(req: Request) {
  const token = bankReadToken();
  if (!token) return new Response("Ikke satt opp", { status: 404, headers: NO_STORE });
  if (!isBankReader(req.headers.get("authorization"), token)) return new Response("Ikke tilgang", { status: 401, headers: NO_STORE });
  const q = query.safeParse({ del: new URL(req.url).searchParams.get("del") ?? undefined });
  if (!q.success) return Response.json({ feil: `Ukjent del. Gyldige: ${BANK_VIEWS.join(", ")}` }, { status: 400, headers: NO_STORE });
  try {
    const data = await asBankReader((d) => readBank(d, q.data.del));
    if (!data) return new Response("Ikke satt opp", { status: 404, headers: NO_STORE });
    return Response.json(data, { headers: NO_STORE });
  } catch (err) {
    await reportError("Øvelsesbank (lesetilgang)", err);
    return new Response("Feil ved lesing", { status: 500, headers: NO_STORE });
  }
}
