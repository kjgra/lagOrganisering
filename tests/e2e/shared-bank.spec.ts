import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("the exercise bank is the same in every group", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Felles ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);

  // Made in football, there in allidrett too.
  await page.goto("/g/G-ALLIDRETT/alle/trening/ovelser");
  await expect(page.getByText("Øvelsesbanken er felles for alle lagene i appen")).toBeVisible();
  await expect(page.locator(".nm-pick a", { hasText: name })).toBeVisible();
});
