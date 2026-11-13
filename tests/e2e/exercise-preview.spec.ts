import { expect, test } from "@playwright/test";
import { loginToEvents, openNextTraining } from "./helpers";

// Issue #105: see an exercise from the bank before adding it to the plan.
test("an exercise in «Lag opplegg» can be seen, and added from the sheet", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.goto(`${page.url().split("?")[0]}/opplegg/endre`);

  await page.getByRole("button", { name: /^Vis 2 mot 1 mot mål/ }).first().click();
  const sheet = page.getByRole("dialog", { name: "2 mot 1 mot mål" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Organisering")).toBeVisible();
  // The player's buttons sit on the picture.
  await expect(sheet.locator(".nm-drawing").getByRole("button", { name: "Spill av" })).toBeVisible();

  // Walk the bank, then back, and add the exercise.
  await sheet.getByRole("button", { name: "Neste", exact: true }).click();
  await expect(sheet).toBeHidden();
  const second = page.getByRole("dialog");
  await expect(second).not.toHaveAccessibleName("2 mot 1 mot mål");
  await second.getByRole("button", { name: "Forrige", exact: true }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Legg til i opplegget" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("heading", { name: "Øvelser (1)" })).toBeVisible();

  // Opened from the chosen list, it can be removed.
  await page.getByRole("button", { name: /^Vis 2 mot 1 mot mål/ }).first().click();
  await sheet.getByRole("button", { name: "Fjern fra opplegget" }).click();
  await expect(page.getByRole("heading", { name: "Øvelser (0)" })).toBeVisible();
});
