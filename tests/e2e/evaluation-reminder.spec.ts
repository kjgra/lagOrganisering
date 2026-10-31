import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// One trainer per project, since an evaluation removes the reminder for that trainer.
test("a training with a plan that I have not evaluated is shown, and goes away when I evaluate it", async ({ page }, info) => {
  await login(page, info.project.name === "mobil" ? "ann@demo.no" : "kjetil@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/arrangementer");
  const reminder = page.getByRole("link", { name: /Du har ikke evaluert økta ennå/ });
  await expect(reminder).toHaveCount(1);
  await reminder.click();
  await expect(page).toHaveURL(/\/opplegg\/\d+\/evaluering$/);

  const session = page.locator("fieldset", { hasText: "Hele økta" });
  await session.getByRole("button", { name: "👍 Bra" }).click();
  // The session has its own keywords.
  const flow = session.getByRole("group", { name: "Stikkord for hele økta" }).getByRole("button", { name: "god flyt mellom øvelsene" });
  await flow.click();
  await expect(flow).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
  await page.goto("/g/G-FOTBALL/alle/arrangementer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(reminder).toHaveCount(0);
});
