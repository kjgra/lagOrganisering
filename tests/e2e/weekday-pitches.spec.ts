import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("Faste baner: set per weekday, shown on the training, changed for one training", async ({ page }, info) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  // Jenter 2015 trains on Tuesdays and is not used by the other tests.
  await page.goto("/g/G-FOTBALL/S-J2015/trening/laget");
  await expect(page.getByRole("heading", { name: "Faste baner per ukedag" })).toBeVisible();
  // The demo's fixed pitches end in two weeks: a reminder, and the main group's rows are shown.
  await expect(page.getByText(/Faste baner for .*torsdager slutter/).first()).toBeVisible();

  await expect(async () => {
    await page.getByRole("button", { name: "Nye faste baner" }).click();
    await expect(page.getByRole("form", { name: "Faste baner fra dato" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const form = page.getByRole("form", { name: "Faste baner fra dato" });
  await form.getByRole("checkbox", { name: "Tirsdag" }).check();
  const tuesday = form.getByRole("group", { name: "Baner tirsdag" });
  await tuesday.getByRole("checkbox").first().check();
  await tuesday.getByRole("checkbox").nth(1).check();
  await form.getByRole("button", { name: "Lagre faste baner" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Faste baner for tirsdager er lagret.");
  await expect(page.getByText("Til neste endring", { exact: false }).first()).toBeVisible();

  await page.goto("/g/G-FOTBALL/S-J2015/arrangementer");
  await page
    .locator(".nm-event", { hasNotText: /Seriekamp|Avlyst/ })
    .nth(info.project.name === "mobil" ? 0 : 1)
    .click();
  await expect(page).toHaveURL(/arrangementer\/E-/);
  await expect(page.getByText("fast for tirsdager")).toBeVisible();

  await expect(async () => {
    await page.getByRole("button", { name: "Endre for denne treningen" }).click();
    await expect(page.getByRole("form", { name: "Baner for denne treningen" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const one = page.getByRole("form", { name: "Baner for denne treningen" });
  await one.getByRole("checkbox").first().uncheck();
  await one.getByRole("button", { name: "Lagre baner" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Banene for treningen er lagret.");
  await expect(page.getByText("endret for denne treningen")).toBeVisible();

  await page.getByRole("button", { name: "Endre for denne treningen" }).click();
  await page.getByRole("button", { name: "Bruk de faste banene" }).click();
  await expect(page.getByText("fast for tirsdager")).toBeVisible();
});
