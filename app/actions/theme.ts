"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";

/** Light (default, best in sunlight), dark, or follow the phone. Stored in a cookie only. */
export async function setTheme(theme: string): Promise<void> {
  const t = z.enum(["light", "dark", "system"]).parse(theme);
  (await cookies()).set("theme", t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * 86400 });
  refresh();
}
