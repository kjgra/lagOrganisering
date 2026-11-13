// Tar skjermbildene til bruksanvisningen fra den simulerte appen (demo-Spond, simulert KI og database).
// Bruk: start appen med `pnpm dev` (uten .env.local, eller med .env.example som .env.local), så
//   node scripts/bruksanvisning/skjermbilder.mjs [navn ...]
// Uten navn tas alle. Bildene havner i public/bruksanvisning/bilder/. Demo-navnene er oppdiktet.
// BASE=http://… for en annen adresse, CHROME=/sti/til/chromium for en annen nettleser.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public/bruksanvisning/bilder");
const G = "/g/G-FOTBALL/S-G2016";
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }).replaceAll("-", "");

// Ruller slik at elementet står like under app-linja øverst.
async function toTop(loc) {
  await loc.evaluate((el) => {
    el.style.scrollMarginTop = "76px";
    el.scrollIntoView({ block: "start" });
  });
}

const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addInitScript(() => {
  const add = () => document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "nextjs-portal{display:none!important}" }));
  if (document.head) add();
  else document.addEventListener("DOMContentLoaded", add);
});
await p.goto(`${BASE}/logg-inn`, { timeout: 180000 });
await p.getByLabel("E-post eller mobilnummer").fill("ann@demo.no");
await p.getByLabel("Passord", { exact: true }).fill("demo");
await p.getByRole("button", { name: "Logg inn" }).click();
await p.waitForURL(/arrangementer|velg-gruppe/, { timeout: 180000 });

// Demodataene flytter seg med dagens dato: finn neste trening og økta påminnelsen ber oss evaluere.
await p.goto(`${BASE}${G}/arrangementer`, { waitUntil: "networkidle", timeout: 180000 });
const hrefs = await p.locator("a[href*='/arrangementer/E-']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
const NEXT = hrefs.find((h) => /\/E-S-G2016-(\d{8})$/.test(h) && h.slice(-8) > today);
const PAST = hrefs.find((h) => /\/opplegg\/\d+\/evaluering$/.test(h))?.replace(/\/opplegg\/\d+\/evaluering$/, "");
if (!NEXT || !PAST) throw new Error(`Fant ikke arrangementene (neste: ${NEXT}, forrige: ${PAST})`);

const SHOTS = [
  ["01-arrangementer", `${G}/arrangementer`],
  ["02-arrangement", NEXT],
  ["03-lag", `${NEXT}/lag`],
  ["04-fordeling", `${NEXT}/lag`, async () => {
    await p.getByRole("button", { name: "Fordeling" }).click();
    await p.getByRole("dialog", { name: "Fordeling" }).waitFor();
  }],
  ["05-opplegg", PAST, async () => {
    await toTop(p.getByText(/^Tidsplan/).first());
    await p.evaluate(() => window.scrollBy(0, -120));
  }],
  ["07-dagens-okt", `${PAST}/dagens-okt`],
  ["08-evaluering", `${PAST}/opplegg/1/evaluering`, async () => {
    // Rask evaluering: 👍 på første øvelse, 👎 og «Hva skurret?» på andre.
    const title = p.locator("legend").filter({ hasText: /^1\. / }).first();
    await toTop(title);
    const sets = p.locator("fieldset");
    await sets.nth(0).getByRole("button", { name: "👍 Bra" }).click().catch(() => {});
    await sets.nth(1).getByRole("button", { name: "👎 Dårlig" }).click().catch(() => {});
    await sets.nth(1).getByRole("button", { name: "mye venting/kø" }).click().catch(() => {});
    await p.waitForTimeout(300);
  }],
  ["10-ovelsesbank", `${G}/trening/ovelser`, async () => {
    await toTop(p.locator(".nm-section-label, h2").filter({ hasText: /Oppvarming/i }).first());
  }],
  ["12-forbedringer", `${G}/trening/forbedringer`],
  ["13-tilbakemelding", "/innstillinger/tilbakemelding"],
  ["14-utstyr", `${G}/trening/laget`, async () => {
    await toTop(p.getByText("Utstyr", { exact: true }).first());
  }],
  ["15-faste-baner", `${G}/trening/laget`, async () => {
    await toTop(p.locator("#faste-baner"));
  }],
  ["16-vis-ovelse", `${G}/trening/ovelser/6/vis`],
  ["17-dekning", `${G}/trening/ovelser/dekning`],
  ["19-animasjon", `${G}/trening/ovelser/8/vis`, async () => {
    // «2 mot 1 mot mål» fra demobanken: spill av, velg B og stopp midt i trinn 2.
    await p.setViewportSize({ width: 390, height: 1000 });
    await p.waitForTimeout(1500);
    await toTop(p.locator(".nm-player"));
    await p.getByRole("button", { name: "Spill av" }).click();
    await p.waitForTimeout(4500);
    await p.getByRole("button", { name: /Dekker løpet/ }).click();
    await p.waitForTimeout(2600);
    await p.getByRole("button", { name: "Pause" }).click().catch(() => {});
    await toTop(p.locator(".nm-player"));
  }],
  ["20-forhandsvis", `${NEXT}/opplegg/endre`, async () => {
    // Trykk på en øvelse i «Lag opplegg» for å se den før den legges til (#105).
    await p.waitForTimeout(1500);
    await p.getByRole("button", { name: /^Vis 2 mot 1 mot mål/ }).first().click();
    await p.getByRole("dialog", { name: "2 mot 1 mot mål" }).waitFor();
    await p.waitForTimeout(400);
  }],
  ["18-bank-pc", `${G}/trening/ovelser`, async () => {
    await p.setViewportSize({ width: 1280, height: 800 });
    await p.waitForTimeout(500);
  }],
];

const only = process.argv.slice(2);
for (const [name, url, act] of SHOTS) {
  if (only.length && !only.includes(name)) continue;
  await p.setViewportSize({ width: 390, height: 780 });
  await p.goto(BASE + url, { waitUntil: "networkidle", timeout: 180000 });
  if (act) {
    await act();
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("ok", name);
}
await b.close();
