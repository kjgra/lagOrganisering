import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("evaluate an exercise from the bank", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
  await page.locator(".nm-pick a").first().click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+\/evaluering/);
  await expect(page.getByLabel("Navn")).toHaveCount(0);

  const ok = page.getByRole("button", { name: "👌 OK" });
  const bad = page.getByRole("button", { name: "👎 Dårlig" });
  // The same trainer may have evaluated it in an earlier run: switch the rating.
  const target = (await ok.getAttribute("aria-pressed")) === "true" ? bad : ok;
  await target.click();
  await page.getByLabel("Bruke igjen?").selectOption("changes");
  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
  await expect(page.getByText(/1 fra banken/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: (await target.textContent())! })).toHaveAttribute("aria-pressed", "true");

  // Changing the exercise is a page of its own: KI first, or by hand.
  await expect(page.getByRole("link", { name: "Juster med KI" })).toBeVisible();
  await page.getByRole("link", { name: "Endre manuelt" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+$/);
  await expect(page.getByLabel("Navn")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lagre evalueringen" })).toHaveCount(0);
});

test("make a new exercise with KI from the bank", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
  await page.getByRole("link", { name: "Ny øvelse med KI" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/ki$/);
  await page.getByLabel("Tema").fill("Samhandling");
  await page.getByLabel("Kategori (valgfritt)").selectOption("smaaspill");
  await page.getByLabel("Antall spillere").fill("8");
  await page.getByRole("button", { name: "Lag øvelse med KI" }).click();
  await expect(page.locator(".nm-toast")).toContainText(/laget med KI .* som kandidat/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+$/);
  await expect(page.getByText(/laget med KI/).first()).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("candidate");
  await expect(page.getByLabel("Min. spillere")).toHaveValue("6");
});

test("adjust an exercise with KI, look it over and save it", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Justeres ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByLabel("Gjennomføring").fill("Spill 3 mot 3");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);

  // KI is the default way to change an exercise; manual edit is a link away.
  await page.getByRole("link", { name: `Juster ${name} med KI` }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+\/ki$/);
  await expect(page.getByRole("link", { name: "Endre manuelt i stedet" })).toBeVisible();
  await page.getByLabel("Hva skal endres?").fill("Mindre kø");
  await page.getByRole("button", { name: "Juster med KI" }).click();
  await expect(page.locator(".nm-toast")).toContainText(`KI har justert «${name}»`, { timeout: 30_000 });
  await expect(page.getByText("Ingenting er lagret ennå")).toBeVisible();
  await expect(page.getByLabel("Gjennomføring")).toHaveValue(/Spill 3 mot 3\nJustert med simulert KI: Mindre kø\./);
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);

  await page.getByRole("link", { name: `Juster ${name} med KI` }).click();
  await page.getByRole("link", { name: "Endre manuelt i stedet" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+$/);
  await expect(page.getByLabel("Gjennomføring")).toHaveValue(/Justert med simulert KI: Mindre kø\./);
});

test("tag an exercise with NFF's fagplan", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  // A new exercise starts with the team's band (G2016 in the demo).
  await expect(page.getByRole("checkbox", { name: "10–12 år", exact: true })).toBeChecked();
  await page.getByLabel("Navn").fill(`NFF-test ${Date.now()}`);
  const field = (label: string) => page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: new RegExp(`^${label}$`) }) }).locator("select");
  await field("Kategori").selectOption("smaaspill");
  await field("Aktivitetskategori").selectOption("spill");
  await page.getByRole("checkbox", { name: /^Vinne ball, hindre motstander/ }).check();
  await page.locator("summary", { hasText: /^Vinne ball, hindre motstander å spille forbi oss · 10–12 år/ }).click();
  await page.getByRole("checkbox", { name: /^Jo tettere press, jo kortere avstander\./ }).check();
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);
  await expect(page.getByText("NFF: 10–12 år · Spill / smålagsspill · Vinne ball, hindre motstander å spille forbi oss").first()).toBeVisible();
});

test("a trainer without admin edits «Trening», but cannot delete exercises or open the admin panel", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/arrangementer");
  await page.getByRole("navigation", { name: "Hovedmeny" }).getByRole("link", { name: "Trening" }).first().click();
  await expect(page).toHaveURL(/\/g\/G-FOTBALL\/S-G2016\/trening\/ovelser$/);
  await expect(page.getByText("Øvelsesbanken er felles for hele Nymark IL – Fotball.")).toBeVisible();

  await page.getByRole("navigation", { name: "Trening" }).getByRole("link", { name: "Slik trener vi" }).click();
  await page.getByLabel("Prinsipper").fill(`Alle har ball ${Date.now()}`);
  await page.getByRole("button", { name: "Lagre prinsippene" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Prinsippene er lagret");

  await page.getByRole("navigation", { name: "Trening" }).getByRole("link", { name: "Øvelser" }).click();
  await page.locator(".nm-pick").first().getByRole("link", { name: /^Juster .* med KI$/ }).click();
  await page.getByRole("link", { name: "Endre manuelt i stedet" }).click();
  await expect(page.getByLabel("Navn")).toBeVisible();
  await expect(page.getByRole("button", { name: "Slett" })).toHaveCount(0);

  // Old admin links lead to «Trening»; the admin panel is still closed.
  await page.goto("/innstillinger/arshjul?lag=G-FOTBALL");
  await expect(page).toHaveURL(/\/g\/G-FOTBALL\/alle\/trening\/arshjul$/);
  await page.goto("/innstillinger/trenere?lag=G-FOTBALL");
  await expect(page).not.toHaveURL(/innstillinger\/trenere/);
});

test("an admin deletes an exercise only after «Er du sikker?»", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Slettes ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("annet");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);
  await page.getByRole("link", { name: `Juster ${name} med KI` }).click();
  await page.getByRole("link", { name: "Endre manuelt i stedet" }).click();
  await page.getByRole("button", { name: "Slett" }).click();
  await expect(page.getByText("Er du sikker? Øvelsen slettes for godt fra banken.")).toBeVisible();
  await page.getByRole("button", { name: "Ja, slett" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Øvelsen er slettet");
  await expect(page.getByRole("link", { name: `Juster ${name} med KI` })).toHaveCount(0);
});

test("a team has the main group's «Laget» until it saves its own, and can follow the main group again", async ({ page }) => {
  await login(page, "ann@demo.no");
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/trening/laget");
  const back = page.getByRole("button", { name: "Følg Nymark IL – Fotball igjen" });
  // An earlier run (mobile first) may have left the team with its own.
  if (await back.isVisible()) {
    await back.click();
    await page.getByRole("button", { name: "Ja, følg Nymark IL – Fotball" }).click();
  }
  await expect(page.getByText("Gutter 2016 følger Nymark IL – Fotball. Lagrer du, får Gutter 2016 sitt eget.")).toBeVisible();
  await expect(page.getByLabel("Øktlengde (min)")).toHaveValue("75");

  await page.getByLabel("Øktlengde (min)").fill("60");
  await page.getByRole("button", { name: "Lagre" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Laget er lagret");
  await expect(page.getByText("Eget for Gutter 2016.")).toBeVisible();

  // The main group keeps its own.
  await page.goto("/g/G-FOTBALL/alle/trening/laget");
  await expect(page.getByLabel("Øktlengde (min)")).toHaveValue("75");

  await page.goto("/g/G-FOTBALL/S-G2016/trening/laget");
  await expect(page.getByLabel("Øktlengde (min)")).toHaveValue("60");
  await page.getByRole("button", { name: "Følg Nymark IL – Fotball igjen" }).click();
  await expect(page.getByText("Er du sikker? Det Gutter 2016 har skrevet her, slettes.")).toBeVisible();
  await page.getByRole("button", { name: "Ja, følg Nymark IL – Fotball" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Laget følger Nymark IL – Fotball igjen.");
  await expect(page.getByLabel("Øktlengde (min)")).toHaveValue("75");
});

test("tell KI how an exercise went, and it fills in the evaluation", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser");
  await page.locator('.nm-pick a[href$="/evaluering"]').nth(1).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\/\d+\/evaluering/);

  await page.getByRole("textbox", { name: "Fortell om øvelsen" }).fill("Den var gøy, men det ble mye kø.");
  await page.getByRole("button", { name: "Fyll ut med KI" }).click();
  await expect(page.locator(".nm-toast")).toContainText("KI har fylt ut evalueringen");
  await expect(page.getByText("KI har fylt ut feltene under")).toBeVisible();
  await expect(page.getByRole("button", { name: "👍 Bra" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "mye venting/kø" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Kommentar")).toHaveValue(/Simulert KI: Den var gøy/);

  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");
});

test("a comment on an exercise shows up in «Dette sier trenerne»", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/ovelser/ny");
  const name = `Innspill ${Date.now()}`;
  await page.getByLabel("Navn").fill(name);
  await page.locator(".nm-field", { has: page.locator(".nm-field__label", { hasText: /^Kategori$/ }) }).locator("select").selectOption("smaaspill");
  await page.getByLabel("Gjennomføring").fill("Spill 4 mot 4");
  await page.getByRole("button", { name: "Lagre øvelsen" }).click();
  await expect(page).toHaveURL(/\/trening\/ovelser$/);

  await page.locator(".nm-pick a", { hasText: name }).click();
  await expect(page).toHaveURL(/\/evaluering$/);
  const evaluation = page.url();
  await page.getByRole("button", { name: "👎 Dårlig" }).click();
  await page.getByRole("textbox", { name: "Kommentar" }).fill("Mye kø, del i to ruter neste gang");
  await page.getByRole("button", { name: "Lagre evalueringen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("Evalueringen er lagret");

  // The analysis runs right after saving; one trainer once is not a pattern yet.
  const exercise = evaluation.replace(/\/evaluering$/, "");
  await expect(async () => {
    await page.goto(exercise);
    await expect(page.getByRole("heading", { name: "Dette sier trenerne" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByText("Nevnt av færre: mye venting/kø (1)")).toBeVisible();
  await expect(page.getByText(/Vektet snitt .* fra 1 vurdering/)).toBeVisible();
});
