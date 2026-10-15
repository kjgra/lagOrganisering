import { parse } from "node-html-parser";
import type { LinkText } from "./plan-ai";
import { AiError } from "./plan-ai";

/**
 * Exercises from links. A trainer may paste up to 3 links on approved sites
 * (tiim.no and fotball.no to start with). The server fetches each page and
 * keeps only the readable text of the exercise. Only https addresses on the
 * approved sites are fetched, also after redirects, with time and size
 * limits, so the server cannot be made to fetch other addresses.
 */

export const LINK_MAX = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS = 6000;

export function hostAllowed(host: string, domains: string[]): boolean {
  const h = host.toLowerCase();
  return !!h && domains.some((d) => h === d || h.endsWith(`.${d}`));
}

/** The approved sites typed by the superadmin: lower-case domains without «www.». */
export function validateDomains(x: string | string[]): string[] {
  const parts = (Array.isArray(x) ? x.join(",") : x).split(/[,\s]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""));
  const d = [...new Set(parts.filter(Boolean))];
  const bad = d.find((s) => !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(s));
  if (bad) throw new AiError(`Ugyldig nettsted: ${bad}.`);
  if (d.length > 10) throw new AiError("Maks 10 nettsteder.");
  return d;
}

export function parseLinks(text: string, domains: string[]): string[] {
  const urls = [...new Set(text.split(/\s+/).map((x) => x.trim()).filter(Boolean))];
  if (urls.length > LINK_MAX) throw new AiError(`Maks ${LINK_MAX} lenker per opplegg.`);
  for (const u of urls) {
    let p: URL;
    try {
      p = new URL(u);
    } catch {
      throw new AiError(`Lenken må starte med https:// (${u.slice(0, 60)}).`);
    }
    if (p.protocol !== "https:" || p.username || p.password || p.port) throw new AiError(`Lenken må starte med https:// (${u.slice(0, 60)}).`);
    if (!hostAllowed(p.hostname, domains)) {
      throw new AiError(`Appen kan bare hente øvelser fra ${domains.join(", ")}. Superadmin kan legge til flere nettsteder under Innstillinger → KI.`);
    }
  }
  return urls;
}

/** The title and readable text of the main content, without scripts, menus, headers and forms. */
export function extractText(html: string): { title: string; text: string } {
  const root = parse(html);
  root.querySelectorAll("script,style,noscript,nav,header,footer,aside,form,svg,iframe,button,[aria-hidden=true],.visually-hidden").forEach((n) => n.remove());
  const og = root.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const title = (og || root.querySelector("h1")?.text || root.querySelector("title")?.text || "").replace(/\s+/g, " ").trim();
  const main = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector("body") ?? root;
  const blocks = main.querySelectorAll("h1,h2,h3,h4,p,li,dt,dd,td,th,figcaption,blockquote");
  const out: string[] = [];
  for (const b of blocks) {
    // Each text once: skip a block inside another block.
    let p = b.parentNode;
    let nested = false;
    while (p && p !== main) {
      if (["LI", "P", "TD", "DD", "BLOCKQUOTE"].includes(p.tagName)) nested = true;
      p = p.parentNode;
    }
    if (nested) continue;
    const t = b.text.replace(/\s+/g, " ").trim();
    if (!t) continue;
    out.push(/^H[1-4]$/.test(b.tagName) ? `\n## ${t}` : b.tagName === "LI" ? `- ${t}` : t);
  }
  let text = (out.length ? out.join("\n") : main.text.replace(/\s+/g, " ")).trim();
  if (text.length > MAX_CHARS) text = `${text.slice(0, MAX_CHARS - 1)}…`;
  return { title, text };
}

/** Fetch the pages (redirects followed by hand and checked) and keep the exercise text. */
export async function fetchLinks(urls: string[], domains: string[]): Promise<LinkText[]> {
  return Promise.all(
    urls.map(async (u) => {
      const fail = (why: string): never => {
        throw new AiError(`Fikk ikke hentet ${u.slice(0, 80)} (${why}).`);
      };
      let url = u;
      let res: Response | null = null;
      for (let hop = 0; hop <= 3; hop++) {
        const p = new URL(url);
        if (p.protocol !== "https:" || !hostAllowed(p.hostname, domains)) fail("siden sendte videre til et annet nettsted");
        try {
          res = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(15_000),
            headers: { "User-Agent": "NymarkGruppeorganisering (Nymark IL, intern treningsplanlegging)" },
          });
        } catch {
          fail("ingen kontakt");
        }
        if (res && res.status >= 300 && res.status < 400 && res.headers.get("location")) {
          url = new URL(res.headers.get("location")!, url).toString();
          continue;
        }
        break;
      }
      if (!res || res.status !== 200) fail(`HTTP ${res?.status ?? "?"}`);
      const type = res!.headers.get("content-type")?.toLowerCase() ?? "";
      if (!/text\/html|application\/xhtml/.test(type)) fail("ikke en nettside");
      const buf = await res!.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) fail("siden er for stor");
      const ex = extractText(new TextDecoder().decode(buf));
      if (ex.text.length < 40) fail("fant ingen øvelsestekst");
      return { url: u, title: ex.title, text: ex.text };
    }),
  );
}
