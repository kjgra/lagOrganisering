import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function evaluate(page: Page, exercise: string, comment: string) {
  await page.goto(exercise + "/evaluering");
  // Click again until the form has hydrated and the rating shows as chosen.
  const bad = page.getByRole("button", { name: "👎 Dårlig" });
  await expect(async () => {
    if ((await bad.getAttribute("aria-pressed")) !== "true") await bad.click();
    await expect(bad).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  const box = page.getByRole("textbox", { name: "Kommentar" });
  await box.fill(comment);
  await expect(box).toHaveValue(comment);
  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
}

test("two trainers say the same, KI proposes a better version, and a trainer uses it", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Forbedres ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByLabel("Gjennomføring").fill("Spill 5 mot 5");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);
  await page.locator(".nm-pick a", { hasText: name }).click();
  await expect(page).toHaveURL(/\/evaluering$/);
  const exercise = page.url().replace(/\/evaluering$/, "");

  await evaluate(page, exercise, "Mye kø, del i to ruter");
  await page.context().clearCookies();
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await evaluate(page, exercise, "Det ble mye kø");

  // The analysis runs right after saving, and makes the proposal.
  await expect(async () => {
    await page.goto(exercise);
    await expect(page.getByRole("link", { name: "Se forslaget" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByText(/Problem:.*Mye venting\/kø: 2 økter, 2 trenere/)).toBeVisible();
  await page.getByRole("link", { name: "Se forslaget" }).click();
  await expect(page).toHaveURL(/\/trening\/forbedringer\/\d+$/);
  await expect(page.getByRole("region", { name: "Hvorfor" })).toContainText("2 økter og 2 trenere nevnte mye venting/kø (organisering).");
  const field = page.getByRole("region", { name: "Gjennomføring" });
  await expect(field.locator("ins").first()).toContainText("Justert med simulert KI");
  await expect(field.locator("del")).toHaveCount(0);

  await page.getByRole("button", { name: "Bruk" }).click();
  await expect(page.locator(".nm-toast")).toContainText(`«${name}» er oppdatert`);
  await expect(page).toHaveURL(/\/trening\/forbedringer$/);
  await expect(page.getByRole("heading", { name: "Behandlet" })).toBeVisible();
  await expect(page.getByText(`${name} · Ny versjon · Brukt`)).toBeVisible();

  await page.goto(exercise);
  await expect(page.getByLabel("Gjennomføring")).toHaveValue(/Justert med simulert KI/);
  await expect(page.getByText(/KI foreslo: Gjennomføring/)).toBeVisible();
});

test("each change is a version, and a trainer can go back to an earlier one", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Versjoner ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByLabel("Gjennomføring").fill("Spill 3 mot 3");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);
  await page.locator(".nm-pick a", { hasText: name }).click();
  await expect(page).toHaveURL(/\/evaluering$/);
  const exercise = page.url().replace(/\/evaluering$/, "");

  await page.goto(exercise);
  await page.getByLabel("Gjennomføring").fill("Spill 4 mot 4");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);

  await page.goto(exercise);
  const versions = page.getByRole("region", { name: "Versjoner" });
  await expect(versions).toContainText("Versjon 2 (nå)");
  await expect(versions).toContainText("Endret av en trener");
  await versions.getByRole("button", { name: "Gå tilbake hit" }).click();
  await versions.getByRole("button", { name: "Ja, gå tilbake" }).click();
  await expect(page.locator(".nm-toast")).toContainText("er tilbake til innholdet i versjon 1");
  await expect(versions).toContainText("Versjon 3 (nå)");
  await expect(page.getByLabel("Gjennomføring")).toHaveValue("Spill 3 mot 3");
});

test("«Forbedringer» shows what trainers keep asking KI for, as counts only", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/forbedringer");
  await expect(page.getByRole("heading", { name: "Dette ber trenerne KI om" })).toBeVisible();
  await expect(page.getByText(/Ingen ønsker går igjen ennå|ganger fra \d+ trenere/).first()).toBeVisible();
});

test("proposals for the whole bank: fill in what is missing, and a new exercise for a gap", async ({ page }, info) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/forbedringer");
  // The demo has one of each, as the nightly run makes them; each width tries one, since they share the database.
  if (info.project.name === "mobil") {
    await page.locator(".nm-pick", { hasText: "Mangler info" }).getByRole("link", { name: "Sistemann med ball" }).click();
    await expect(page.getByRole("region", { name: "Hvorfor" })).toContainText("Forslaget fyller bare inn det som mangler.");
    await expect(page.getByRole("region", { name: "Min. spillere" }).locator("ins")).toHaveText("6");
    await expect(page.getByRole("region", { name: "NFF-tagger" }).locator("ins").first()).toHaveText("Føring");
    await expect(page.getByRole("region", { name: "Gjennomføring" })).toHaveCount(0);
    await page.getByRole("button", { name: "Bruk" }).click();
    await expect(page.locator(".nm-toast")).toContainText("«Sistemann med ball» har fått det som manglet");
    await expect(page.getByText("Sistemann med ball · Mangler info · Brukt")).toBeVisible();
  } else {
    await page.locator(".nm-pick", { hasText: "Ny øvelse" }).getByRole("link", { name: "Skattejakt med småmål" }).click();
    await expect(page.getByRole("region", { name: "Hvorfor" })).toContainText("Banken har ingen gode øvelser for 6–7 år med hovedtemaet «Score mål»");
    await expect(page.getByRole("region", { name: "Aldersbånd" })).toContainText("6–7 år");
    await expect(page.getByRole("region", { name: "NFF-tagger" })).toContainText("Score mål");
    await expect(page.getByText("(tomt)")).toHaveCount(0);
    await page.getByRole("link", { name: "Endre først" }).click();
    await expect(page).toHaveURL(/\/endre$/);
    const name = page.getByRole("textbox", { name: "Navn" });
    await expect(name).toHaveValue("Skattejakt med småmål");
    await name.fill("Skattejakt med fire mål");
    await page.getByRole("button", { name: "Lagre øvelsen" }).click();
    await expect(page.locator(".nm-toast")).toContainText("«Skattejakt med fire mål» er lagret");
    await page.goto("/g/G-FOTBALL/alle/trening/forbedringer");
    await expect(page.getByText(/Skattejakt med (småmål|fire mål) · Ny øvelse · Brukt med endringer/)).toBeVisible();
    await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
    await expect(page.locator(".nm-pick", { hasText: "Skattejakt med fire mål" })).toBeVisible();
  }
});

test("«Innsikt» shows whether KI gets better, as counts for every team", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/forbedringer");
  await page.getByRole("navigation", { name: "Forbedringer" }).getByRole("link", { name: "Innsikt" }).click();
  await expect(page).toHaveURL(/\/forbedringer\/innsikt$/);
  await expect(page.getByRole("navigation", { name: "Forbedringer" }).getByRole("link", { name: "Innsikt" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Hurtigopplegg brukt uendret" })).toBeVisible();
  await expect(page.getByRole("region", { name: "KI-øvelser beholdt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Per måned" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Virker forbedringene?" })).toBeVisible();
  await page.getByRole("navigation", { name: "Forbedringer" }).getByRole("link", { name: "Forslag" }).click();
  await expect(page).toHaveURL(/\/forbedringer$/);
});
