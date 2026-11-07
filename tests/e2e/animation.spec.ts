import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("an exercise plays step by step, and a choice shows each solution", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
  await page.getByRole("link", { name: "2 mot 1 mot mål", exact: true }).click();
  await expect(page).toHaveURL(/\/vis$/);

  const player = page.locator(".nm-player");
  await expect(player.getByText("1 fører ballen rett mot forsvareren")).toBeVisible();
  await expect(player.getByText("Valg i trinn 2: Hva gjør forsvareren?")).toBeVisible();

  // Step forward: the first step plays, then the next one starts.
  const next = player.getByRole("button", { name: "Neste trinn" });
  await next.click();
  await expect(player.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(player.getByRole("button", { name: "Pause" })).toBeHidden({ timeout: 10_000 });
  await next.click();
  await expect(player.getByText("Forsvareren går mot ballen. Da spiller 1 til 2 i rommet")).toBeVisible();

  // Choosing B shows the other solution from the step of the choice.
  await player.getByRole("button", { name: /Dekker løpet/ }).click();
  await expect(player.getByText("Forsvareren dekker løpet. Da fører 1 ballen forbi på venstre side")).toBeVisible();

  // The still picture names the alternatives.
  await player.getByRole("button", { name: "Skisse" }).click();
  await expect(player.getByText("Går mot ballen")).toBeVisible();
  await expect(player.getByRole("img", { name: /Tegning av 2 mot 1 mot mål/ })).toBeVisible();
});
