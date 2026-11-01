import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("Hurtigopprett: teams and a KI plan as drafts in one tap", async ({ page }, info) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  // Gutter 2017 is not used by the other tests, so its trainings have no teams or plan yet.
  await page.goto("/g/G-FOTBALL/S-G2017/arrangementer");
  await page
    .locator(".nm-event", { hasNotText: /Seriekamp|Avlyst/ })
    .nth(info.project.name === "mobil" ? 0 : 1)
    .click();
  await expect(page).toHaveURL(/arrangementer\/E-/);

  const sheet = page.getByRole("dialog", { name: "Hurtigopprett" });
  await expect(async () => {
    await page.getByRole("button", { name: "Hurtigopprett" }).click();
    await expect(sheet).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(sheet.getByText(/^\d+ lag (à|med) /)).toBeVisible();
  await expect(sheet.getByText(/^\d+ min · /)).toBeVisible();
  // Asked only when the season plan has no theme, or the team has several pitches and none chosen before.
  const theme = sheet.getByLabel("Tema");
  if (await theme.isVisible()) await theme.fill("Pasning");
  const pitches = sheet.getByRole("group", { name: "Baner for økta" });
  if (await pitches.isVisible()) await pitches.getByRole("checkbox").first().check();
  await sheet.getByRole("button", { name: "Lag alt" }).click();

  await expect(page).toHaveURL(/opplegg=/, { timeout: 30_000 });
  await expect(page.locator(".nm-toast")).toContainText("Lag og opplegg er laget som utkast");
  await expect(page.locator(".nm-proposals")).toContainText("Hurtigforslag");
  await expect(page.locator("#plan-h")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hurtigopprett" })).toHaveCount(0);
});
