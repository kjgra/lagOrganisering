import "server-only";
import { env } from "@/lib/env";
import { realSpond, type SpondApi } from "./client";
import { mockSpond } from "./mock";

/** The Spond API in use: the real one, or the fake one with SPOND_MOCK=true. */
export function spond(): SpondApi {
  return env().SPOND_MOCK ? mockSpond : realSpond;
}

export { SpondError } from "./client";
