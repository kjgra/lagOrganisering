import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("a trainer sees how the bank covers the fagplan and opens a cell", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/trening/ovelser");
  await page.getByRole("link", { name: "Dekning av fagplanen" }).click();
  await expect(page.getByRole("heading", { name: "Dekning av fagplanen" })).toBeVisible();
  for (const b of ["6–7 år", "8–9 år", "10–12 år"]) await expect(page.getByRole("heading", { name: b })).toBeVisible();
  await expect(page.getByText(/av 40 celler har minst 2 gode øvelser/)).toBeVisible();
  await page.getByRole("link", { name: /^8–9 år, Vinne ball, hindre motstander å spille forbi oss, Spille med og mot:/ }).click();
  await expect(page).toHaveURL(/celle=8-9\.vinne-ball\.med-og-mot/);
  await expect(page.getByRole("heading", { name: "8–9 år · Vinne ball, hindre motstander å spille forbi oss · Spille med og mot" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Last ned hullene" })).toHaveAttribute("download", "dekning-hull.json");
});
