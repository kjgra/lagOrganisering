import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("a trainer sends feedback, and the superadmin edits and sends it to GitHub", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/arrangementer");
  await page.getByRole("link", { name: "Gi tilbakemelding" }).click();
  await expect(page).toHaveURL(/\/innstillinger\/tilbakemelding\?fra=/);

  const text = `Lagforslaget forsvant ${Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8)}`;
  const box = page.getByRole("textbox", { name: "Hva skjedde, og hva gjorde du da?" });
  // Names are stopped, since the text can become public.
  await expect(async () => {
    await box.fill("Ann fikk feil");
    await expect(box).toHaveValue("Ann fikk feil", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: "Send tilbakemelding" }).click();
  await expect(page.locator(".nm-alert")).toContainText("«Ann»");

  await box.fill(text);
  await page.getByRole("button", { name: "Send tilbakemelding" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Takk! Tilbakemeldingen er sendt.");

  await page.context().clearCookies();
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/tilbakemeldinger");
  const item = page.getByRole("listitem").filter({ has: page.getByRole("textbox", { name: "Tekst som publiseres" }) }).filter({ hasText: /arrangementer/ }).last();
  const edit = item.getByRole("textbox", { name: "Tekst som publiseres" });
  await expect(edit).toHaveValue(text);
  await expect(item).toContainText("/g/…/…/arrangementer");
  await expect(async () => {
    await edit.fill(`${text} (rettet)`);
    await expect(edit).toHaveValue(`${text} (rettet)`, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await item.getByRole("button", { name: "Send til GitHub" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Simulert");
  await expect(page.getByRole("heading", { name: "Sendt til GitHub" })).toBeVisible();
  await expect(page.getByText(`${text} (rettet)`)).toBeVisible();
});

test("a trainer without admin does not get the inbox", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/tilbakemeldinger");
  await expect(page).not.toHaveURL(/tilbakemeldinger/);
  await expect(page.getByRole("textbox", { name: "Tekst som publiseres" })).toHaveCount(0);
});
