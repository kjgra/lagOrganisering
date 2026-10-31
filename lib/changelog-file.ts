import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pkg from "@/package.json";
import { parseChangelog, type Release } from "@/lib/changelog";

/** The app's version, from package.json. */
export const APP_VERSION: string = pkg.version;

/** CHANGELOG.md from the repo root (traced into the build in next.config.ts). */
export async function readChangelog(): Promise<Release[]> {
  try {
    return parseChangelog(await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8"));
  } catch {
    return [];
  }
}
