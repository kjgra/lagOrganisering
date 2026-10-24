import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin: evaluate an exercise from the bank", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/ovelser?lag=G-FOTBALL");
  await page.locator(".nm-pick a").first().click();
  await expect(page).toHaveURL(/\/innstillinger\/ovelse\/\d+\/evaluering/);
  await expect(page.getByLabel("Navn")).toHaveCount(0);

  const ok = page.getByRole("button", { name: "👌 OK" });
  const bad = page.getByRole("button", { name: "👎 Dårlig" });
  // The same trainer may have evaluated it in an earlier run: switch the rating.
  const target = (await ok.getAttribute("aria-pressed")) === "true" ? bad : ok;
  await target.click();
  await page.getByLabel("Bruke igjen?").selectOption("changes");
  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
  await expect(page.getByText(/1 fra banken/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: (await target.textContent())! })).toHaveAttribute("aria-pressed", "true");

  // Changing the exercise is a page of its own.
  await page.getByRole("link", { name: "Endre øvelsen" }).click();
  await expect(page).toHaveURL(/\/innstillinger\/ovelse\/\d+\?/);
  await expect(page.getByLabel("Navn")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lagre evalueringen" })).toHaveCount(0);
});

test("admin: make a new exercise with KI from the bank", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/ovelser?lag=G-FOTBALL");
  await page.getByRole("link", { name: "Ny øvelse med KI" }).click();
  await expect(page).toHaveURL(/\/innstillinger\/ovelse\/ki\?/);
  await page.getByLabel("Tema").fill("Samhandling");
  await page.getByLabel("Kategori (valgfritt)").selectOption("smaaspill");
  await page.getByLabel("Antall spillere").fill("8");
  await page.getByRole("button", { name: "Lag øvelse med KI" }).click();
  await expect(page.locator(".nm-toast")).toContainText(/laget med KI .* som kandidat/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/innstillinger\/ovelse\/\d+\?/);
  await expect(page.getByText(/laget med KI/).first()).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("candidate");
  await expect(page.getByLabel("Min. spillere")).toHaveValue("6");
});

test("admin: tag an exercise with NFF's fagplan", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/ovelse/ny?lag=G-FOTBALL");
  // A new exercise starts with the team's band (G2016 in the demo).
  await expect(page.getByRole("checkbox", { name: "10–12 år", exact: true })).toBeChecked();
  await page.getByLabel("Navn").fill(`NFF-test ${Date.now()}`);
  const field = (label: string) => page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: new RegExp(`^${label}$`) }) }).locator("select");
  await field("Kategori").selectOption("smaaspill");
  await field("Aktivitetskategori").selectOption("spill");
  await page.getByRole("checkbox", { name: /^Vinne ball, hindre motstander/ }).check();
  await page.locator("summary", { hasText: /^Vinne ball, hindre motstander å spille forbi oss · 10–12 år/ }).click();
  await page.getByRole("checkbox", { name: /^Jo tettere press, jo kortere avstander\./ }).check();
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/innstillinger\/ovelser/);
  await expect(page.getByText("NFF: 10–12 år · Spill / smålagsspill · Vinne ball, hindre motstander å spille forbi oss").first()).toBeVisible();
});
