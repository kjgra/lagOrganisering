// Lager PDF-en av bruksanvisningen (public/bruksanvisning/index.html).
// Bruk: node scripts/bruksanvisning/lag-pdf.mjs [utfil]   (standard: bruksanvisning.pdf)
// Krever Playwright med Chromium (`pnpm exec playwright install chromium`).
// CHROME=/sti/til/chromium for en annen nettleser.
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../../public/bruksanvisning/index.html");
const out = path.resolve(process.argv[2] || "bruksanvisning.pdf");

const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage();
await p.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
// Alle bildene må være lastet, ellers blir PDF-en stående med hull.
const broken = await p.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute("src")));
if (broken.length) throw new Error(`Bilder som mangler: ${broken.join(", ")}`);
await p.pdf({
  path: out,
  format: "A4",
  preferCSSPageSize: true,
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font:8px sans-serif;color:#6b6a65;padding:0 16mm;display:flex;justify-content:space-between"><span>Nymark – Gruppeorganisering · Bruksanvisning for trenere</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await b.close();
console.log(`Laget ${out}`);
