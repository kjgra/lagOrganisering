import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function chooseBank(page: Page, option: RegExp) {
  await page.goto("/innstillinger/vedlikehold?lag=G-FOTBALL");
  const section = page.getByRole("region", { name: "Felles øvelsesbank" });
  await section.getByLabel("Øvelsesbank").selectOption({ label: (await section.getByRole("option", { name: option }).textContent())! });
  await section.getByRole("button", { name: "Lagre" }).click();
}

test("superadmin lets every group use one bank, and each group gets its own again", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  // An exercise only the football group has.
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Felles ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);
  await page.goto("/g/G-ALLIDRETT/alle/trening/ovelser");
  await expect(page.locator(".nm-pick a", { hasText: name })).toHaveCount(0);

  try {
    await chooseBank(page, /^Felles: Nymark IL – Fotball$/);
    await expect(page.locator(".nm-toast")).toContainText("Alle grupper bruker nå øvelsesbanken til Nymark IL – Fotball.");

    await page.goto("/g/G-ALLIDRETT/alle/trening/ovelser");
    await expect(page.getByText("Øvelsesbanken er felles for alle gruppene i appen")).toBeVisible();
    await expect(page.locator(".nm-pick a", { hasText: name }).first()).toBeVisible();
  } finally {
    await chooseBank(page, /^Hver gruppe har sin egen/);
    await expect(page.locator(".nm-toast")).toContainText("Hver gruppe har nå sin egen øvelsesbank.");
  }
  await page.goto("/g/G-ALLIDRETT/alle/trening/ovelser");
  await expect(page.getByText("Øvelsesbanken er felles for alle gruppene i appen")).toHaveCount(0);
});
