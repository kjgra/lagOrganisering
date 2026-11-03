import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("the bank is a grid with thumbnails and filters on a wide screen, and a list on a phone", async ({ page }, info) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
  const filters = page.getByRole("search", { name: "Filtrer øvelsene" });
  const card = page.locator(".nm-pick").filter({ has: page.getByRole("link", { name: "Hjem bak ballen", exact: true }) });
  const rondo = page.locator(".nm-pick").filter({ has: page.getByRole("link", { name: "Rondo 4 mot 1", exact: true }) });

  if (info.project.name === "mobil") {
    await expect(card).toBeVisible();
    await expect(filters).toBeHidden();
    await expect(card.locator(".nm-thumb")).toBeHidden();
    return;
  }

  await expect(filters).toBeVisible();
  // «Hjem bak ballen» has a drawing in the demo: its thumbnail is the drawing.
  await expect(card.locator(".nm-thumb svg[aria-label='Tegning av Hjem bak ballen']")).toBeVisible();
  // Exercises without a drawing get a made-up one.
  await expect(page.locator(".nm-thumb__made").first()).toBeVisible();

  // The filters work once the page is hydrated; in dev that can take a moment.
  await expect(async () => {
    await filters.getByLabel("Kategori").selectOption("forsvar");
    await expect(filters.getByRole("status")).toContainText(/Viser \d+ av \d+ øvelser/, { timeout: 1000 });
  }).toPass();
  await expect(card).toBeVisible();
  await expect(rondo).toHaveCount(0);
  await expect(page).toHaveURL(/kategori=forsvar/);

  // The title shows the exercise, and «Tilbake» keeps the filters.
  await card.getByRole("link", { name: "Hjem bak ballen", exact: true }).click();
  await expect(page).toHaveURL(/\/vis$/);
  await page.goBack();
  await expect(filters.getByLabel("Kategori")).toHaveValue("forsvar");
  await expect(rondo).toHaveCount(0);

  await filters.getByLabel("Søk i navn").fill("finnes ikke");
  await expect(page.getByText("Ingen øvelser passer filtrene.")).toBeVisible();
  await filters.getByRole("button", { name: "Nullstill filtre" }).click();
  await expect(rondo).toBeVisible();
  await expect(page).not.toHaveURL(/kategori=/);
});
