import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin: evaluate an exercise from the bank", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/ovelser?lag=G-FOTBALL");
  await page.locator(".nm-pick a").first().click();
  await expect(page).toHaveURL(/\/innstillinger\/ovelse\/\d+/);

  const form = page.locator("#evaluering");
  const ok = form.getByRole("button", { name: "👌 OK" });
  const bad = form.getByRole("button", { name: "👎 Dårlig" });
  // The same trainer may have evaluated it in an earlier run: switch the rating.
  const target = (await ok.getAttribute("aria-pressed")) === "true" ? bad : ok;
  await target.click();
  await form.getByLabel("Bruke igjen?").selectOption("changes");
  await form.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
  await expect(form.getByText(/1 fra banken/)).toBeVisible();

  await page.reload();
  await expect(page.locator("#evaluering").getByRole("button", { name: (await target.textContent())! })).toHaveAttribute("aria-pressed", "true");
});
