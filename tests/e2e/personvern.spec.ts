import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("the superadmin sees and downloads what is stored about a player", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/personvern?lag=G-FOTBALL");
  await expect(page.getByRole("heading", { name: "Personvern" })).toBeVisible();
  await page.getByLabel("Person").selectOption("M-S-G2016-3");
  await page.getByRole("button", { name: "Vis" }).click();
  await expect(page).toHaveURL(/person=M-S-G2016-3/);
  await expect(page.getByText("Nivå: 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Slett opplysningene" })).toBeVisible();

  const res = await page.request.get("/api/personvern?lag=G-FOTBALL&person=M-S-G2016-3");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.spond_medlem_id).toBe("M-S-G2016-3");
  expect(json.som_spiller["member_levels.spond_member_id"][0].level).toBe(3);
});

test("a trainer without superadmin cannot download personal data", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  expect((await page.request.get("/api/personvern?lag=G-FOTBALL&person=M-S-G2016-3")).status()).toBe(403);
});

test("the privacy notice is open without login and linked from the login page", async ({ page }) => {
  await page.goto("/logg-inn");
  await page.getByRole("link", { name: "Personvern" }).click();
  await expect(page).toHaveURL(/\/personvern$/);
  await expect(page.getByRole("heading", { name: "Personvern", level: 1 })).toBeVisible();
  await expect(page.getByText("lagrer ikke navn", { exact: false })).toBeVisible();
});
