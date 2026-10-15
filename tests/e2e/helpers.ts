import { expect, type Page } from "@playwright/test";

export async function login(page: Page, who = "kjetil@demo.no") {
  await page.goto("/logg-inn");
  await page.getByLabel("E-post eller mobilnummer").fill(who);
  await page.getByLabel("Passord", { exact: true }).fill("demo");
  await page.getByRole("button", { name: "Logg inn" }).click();
}

export async function loginToEvents(page: Page) {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/arrangementer");
}

/** The next training (not a match or cancelled) in Gutter 2016. */
export async function openNextTraining(page: Page) {
  await page.locator(".nm-event", { hasNotText: /Seriekamp|Avlyst/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-/);
}
