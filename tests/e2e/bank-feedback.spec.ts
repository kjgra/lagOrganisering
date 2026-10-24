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
