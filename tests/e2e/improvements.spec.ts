import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function evaluate(page: Page, exercise: string, comment: string) {
  await page.goto(exercise + "/evaluering");
  await page.getByRole("button", { name: "👎 Dårlig" }).click();
  await page.getByRole("textbox", { name: "Kommentar" }).fill(comment);
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
