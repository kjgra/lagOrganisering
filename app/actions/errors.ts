"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current";
import { reportError } from "@/lib/errors";

const input = z.object({
  name: z.string().max(100),
  message: z.string().max(2000),
  stack: z.string().max(8000),
  path: z.string().max(500),
});

/**
 * An error in the browser (a page that crashed on the phone). Only from
 * someone logged in, so the log cannot be filled from outside. Errors that
 * came from the server (with a digest) are already logged there.
 */
export async function reportClientErrorAction(raw: unknown): Promise<void> {
  const v = input.safeParse(raw);
  if (!v.success) return;
  const u = await getCurrentUser();
  if (!u.ok) return;
  const err = new Error(v.data.message);
  err.name = v.data.name || "Error";
  err.stack = v.data.stack;
  await reportError("Nettleser", err, { route: v.data.path, source: "klient" });
}
