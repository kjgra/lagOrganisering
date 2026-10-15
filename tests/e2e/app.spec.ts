import { expect, test } from "@playwright/test";
import { login, loginToEvents, openNextTraining } from "./helpers";

test("trainer without app access is stopped after Spond login", async ({ page }) => {
  await login(page, "beate@demo.no");
  await expect(page.getByRole("heading", { name: "Ingen tilgang" })).toBeVisible();
  await expect(page.getByText("du har ikke fått tilgang til denne appen")).toBeVisible();
});

test("wrong password gives a message", async ({ page }) => {
  await page.goto("/logg-inn");
  await page.getByLabel("E-post eller mobilnummer").fill("kjetil@demo.no");
  await page.getByLabel("Passord", { exact: true }).fill("feil");
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page.locator(".nm-alert")).toBeVisible();
});

test("make teams with tap-to-move and save the proposal", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.getByRole("link", { name: /Lag lag av/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  const lag1 = page.locator('section[aria-label^="Lag 1"]');
  const lag2 = page.locator('section[aria-label^="Lag 2"]');
  const first = lag1.locator(".nm-chip").first();
  const before = await lag2.locator(".nm-chip").count();
  await first.click();
  await lag2.locator(".nm-team__drop").click();
  await expect(lag2.locator(".nm-chip")).toHaveCount(before + 1);
  await page.getByRole("button", { name: /Lagre forslag/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-[^/]+$/);
  await expect(page.locator(".nm-proposal").first()).toBeVisible();
});

test("training plan: from the bank, approve, adjust with KI, PDF", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  const eventUrl = page.url().split("?")[0];
  await page.goto(`${eventUrl}/opplegg/endre`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Legg til" }).first().click();
  await page.getByRole("button", { name: /Lagre opplegget/ }).click();
  await expect(page).toHaveURL(/opplegg=/);
  await page.getByRole("button", { name: /Godkjenn versjon \d+/ }).click();
  await expect(page.locator(".nm-toast")).toContainText(/er godkjent/);
  await expect(page.locator(".nm-badge", { hasText: "Godkjent" })).toBeVisible();

  await page.getByRole("link", { name: "Juster med KI" }).click();
  await page.getByLabel("Hva skal endres?").fill("Mer konkurranse");
  await page.getByRole("button", { name: "Juster med KI" }).click();
  await expect(page).toHaveURL(/opplegg=/, { timeout: 30_000 });
  await expect(page.locator(".nm-toast")).toContainText(/laget med KI/);

  const href = await page.getByRole("link", { name: "Last ned PDF" }).getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});

test("admin: give KI access and save the season plan", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/trenere?lag=G-FOTBALL");
  const ki = page.getByLabel("KI for Emma Haugen");
  const was = await ki.isChecked();
  await ki.click();
  await expect(ki).toBeChecked({ checked: !was });
  await expect(page.getByLabel("Admin for Kjetil Gramstad")).toBeDisabled();

  await page.goto("/innstillinger/arshjul?lag=G-FOTBALL");
  await page.getByLabel("Januar").fill("Pasning");
  await page.getByRole("button", { name: "Lagre årshjulet" }).click();
  await expect(page.locator(".nm-toast")).toContainText(/Årshjulet for \d{4} er lagret/);
});

test("a starred group stays starred", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/velg-gruppe");
  // On the phone the subgroups show after picking the main group.
  const main = page.getByRole("button", { name: /^Nymark IL – Fotball/ });
  if (await main.isVisible()) await main.click();
  const star = page.getByRole("button", { name: /^Legg .* til i favoritter$/ }).first();
  const label = (await star.getAttribute("aria-label"))!.replace(/^Legg (.*) til i favoritter$/, "$1");
  await star.click();
  const on = page.getByRole("button", { name: `Fjern ${label} fra favoritter` }).first();
  await expect(on).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1500);
  await expect(on).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  if (await main.isVisible()) await main.click();
  await expect(page.getByRole("button", { name: `Fjern ${label} fra favoritter` }).first()).toBeVisible();
  // Clean up for the next run.
  await page.getByRole("button", { name: `Fjern ${label} fra favoritter` }).first().click();
});
