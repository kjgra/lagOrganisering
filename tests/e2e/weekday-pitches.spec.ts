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
  // All the pitches at Nymark, folded per main pitch.
  const tuesday = form.getByRole("group", { name: "Baner tirsdag" });
  await tuesday.locator("summary", { hasText: /^Nymark Kunstgress 04/ }).click();
  await tuesday.getByRole("checkbox", { name: /^Nymark Kunstgress 04 9er A/ }).check();
  await tuesday.getByRole("checkbox", { name: /^Nymark Kunstgress 04 9er B/ }).check();
  await form.getByRole("button", { name: "Lagre faste baner" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Faste baner for tirsdager er lagret.");
  // One card per banefordeling; each day with its dates and one pitch per line.
  const card = page.getByRole("region", { name: /^Banefordeling fra \d\d\.\d\d\.\d\d$/ });
  await expect(card.getByRole("group", { name: /^Tirsdag fra / })).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveText(["Nymark Kunstgress 04 9er A", "Nymark Kunstgress 04 9er B"]);

  // Editing opens the whole banefordeling: here, take the 9er B out.
  await card.getByRole("button", { name: "Endre banefordelingen" }).click();
  const edit = page.getByRole("form", { name: "Endre banefordelingen" });
  await edit.getByRole("group", { name: "Baner tirsdag" }).getByRole("checkbox", { name: /^Nymark Kunstgress 04 9er B/ }).uncheck();
  await edit.getByRole("button", { name: "Lagre faste baner" }).click();
  await expect(card.getByRole("listitem")).toHaveText(["Nymark Kunstgress 04 9er A"]);

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
  await one.getByRole("checkbox", { name: /^Nymark Kunstgress 04 9er B/ }).check();
  await one.getByRole("button", { name: "Lagre baner" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Banene for treningen er lagret.");
  await expect(page.getByText("endret for denne treningen")).toBeVisible();

  await page.getByRole("button", { name: "Endre for denne treningen" }).click();
  await page.getByRole("button", { name: "Bruk de faste banene" }).click();
  await expect(page.getByText("fast for tirsdager")).toBeVisible();
});
