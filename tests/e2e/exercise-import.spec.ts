import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const ex = (name: string, organisation: string, execution: string) => ({
  name,
  category: "ballmestring",
  themes: ["Score mål"],
  bands: ["6-7"],
  nff_activity: "sjef-intro",
  organisation,
  execution,
});

test("the superadmin imports exercises from a file", async ({ page }, info) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/trening/ovelser");
  await page.getByRole("link", { name: "Importer øvelser fra fil" }).click();
  await expect(page).toHaveURL(/ovelser\/import/);

  // Mobile and desktop share the server's database: different words, so they are not too alike.
  const mobile = info.project.name === "mobil";
  const name = `Importtest ${info.project.name}`;
  const file = {
    ovelser: [
      mobile
        ? ex(name, "Rute 12 × 12 m med kjegler i hjørnene", "Alle sjonglerer med ballen og teller treff før den treffer bakken")
        : ex(name, "Sirkel med diameter 20 m og fem hatter i midten", "Spillerne fører ballen inn og velter hatter med sålen"),
      { name: "Uten kategori", category: "tull" },
    ],
  };
  await page.locator('input[type="file"]').setInputFiles({ name: "ovelser.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expect(page.getByText("2 øvelser i fila, 1 blir lagt inn.")).toBeVisible();
  await expect(page.getByText("Velg en kategori.")).toBeVisible();
  await page.getByRole("button", { name: "Legg inn én øvelse" }).click();
  await expect(page).toHaveURL(/trening\/ovelser$/);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
});

test("a trainer without superadmin has no import", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/trening/ovelser");
  await expect(page.getByRole("link", { name: "Importer øvelser fra fil" })).toHaveCount(0);
  await page.goto("/g/G-FOTBALL/S-G2016/trening/ovelser/import");
  await expect(page.getByRole("heading", { name: "Importer øvelser" })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
