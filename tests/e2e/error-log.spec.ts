import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("the health check answers with the version", async ({ request }) => {
  const res = await request.get("/api/helse");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { ok: boolean; versjon: string };
  expect(body.ok).toBe(true);
  expect(body.versjon).toMatch(/^\d+\.\d+\.\d+$/);
});

test("only the superadmin sees the error log", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/feillogg");
  await expect(page.getByRole("heading", { name: "Feillogg" })).toBeVisible();
  await expect(page.getByText("Demo og preview: feilene lagres bare her")).toBeVisible();

  await page.context().clearCookies();
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/feillogg");
  await expect(page.getByRole("heading", { name: "Feillogg" })).toHaveCount(0);
  await expect(page.getByText("Demo og preview: feilene lagres bare her")).toHaveCount(0);
});
