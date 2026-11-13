import { expect, test } from "@playwright/test";
import { login, loginToEvents, openFordeling, openNextTraining } from "./helpers";

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
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  const lag1 = page.locator('section[aria-label^="Lag 1"]');
  const lag2 = page.locator('section[aria-label^="Lag 2"]');
  const first = lag1.locator(".nm-chip").first();
  await expect(first).toBeVisible();
  const before = await lag2.locator(".nm-chip").count();
  await first.click();
  await lag2.locator(".nm-team__drop").click();
  await expect(lag2.locator(".nm-chip")).toHaveCount(before + 1);
  await page.getByRole("button", { name: /Lagre forslag/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-[^/]+$/);
  await expect(page.locator(".nm-proposal").first()).toBeVisible();
});

test("players who have not answered are available, but not placed automatically", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  const pool = page.locator('section[aria-label="Tilgjengelige, ikke fordelt"]');
  await expect(pool.locator(".nm-chip", { hasText: "Ikke svart" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Fordel på nytt" }).first().click();
  await expect(page.locator(".nm-toast")).toContainText("fordelt på nytt");
  await expect(page.locator(".nm-team:not(.nm-team--pool) .nm-chip", { hasText: "Ikke svart" })).toHaveCount(0);
  await expect(pool.locator(".nm-chip", { hasText: "Ikke svart" }).first()).toBeVisible();
});

test("an approved proposal can be edited from the event, and stays approved", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  await page.getByLabel("Navn på forslaget").fill("Til godkjenning e2e");
  await page.getByText("Send til godkjenning når jeg lagrer").click();
  await page.getByRole("button", { name: /Lagre og send/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-[^/]+$/);
  const card = page.locator(".nm-proposal", { hasText: "Til godkjenning e2e" });
  await card.getByRole("button", { name: "Godkjenn" }).click();
  await expect(card.locator(".nm-badge", { hasText: "Godkjent" })).toBeVisible();
  await card.getByRole("link", { name: "Åpne og rediger" }).click();
  await expect(page).toHaveURL(/\/lag\/\d+$/);
  await expect(page.getByText("Forslaget har status «Godkjent».")).toBeVisible();
  await page.getByLabel("Navn på forslaget").fill("Godkjent og endret e2e");
  await page.getByRole("button", { name: /Lagre forslag/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-[^/]+$/);
  const edited = page.locator(".nm-proposal", { hasText: "Godkjent og endret e2e" });
  await expect(edited.locator(".nm-badge", { hasText: "Godkjent" })).toBeVisible();
});

test("Fordeling: choose nivådelt, and it is remembered", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  await openFordeling(page);
  const sheet = page.getByRole("dialog", { name: "Fordeling" });
  await expect(sheet.getByRole("radio", { name: /Jevne lag/ })).toBeChecked();
  await sheet.getByRole("radio", { name: /Nivådelt/ }).check();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("levels"));
  await sheet.getByRole("button", { name: "Bruk og fordel på nytt" }).click();
  await saved;
  await expect(sheet).toBeHidden();
  await expect(page.locator(".nm-toast")).toContainText("fordelt på nytt");
  await expect(page.locator(".nm-chip").first()).toBeVisible();
  await page.reload();
  await openFordeling(page);
  await expect(page.getByRole("dialog", { name: "Fordeling" }).getByRole("radio", { name: /Nivådelt/ })).toBeChecked();
  // Back to the default, so the other tests (and the desktop run) start the same way.
  await page.getByRole("dialog", { name: "Fordeling" }).getByRole("radio", { name: /Jevne lag/ }).check();
  const reset = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("even"));
  await page.getByRole("button", { name: "Bruk og fordel på nytt" }).click();
  await reset;
});

test("Fordeling: «Som sist» builds on the teams of the training before", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await page.getByRole("button", { name: /Lagre forslag/ }).first().click();
  await expect(page).toHaveURL(/arrangementer\/E-[^/]+$/);
  await page.goto("/g/G-FOTBALL/S-G2016/arrangementer");
  await page.locator(".nm-event", { hasNotText: /Seriekamp|Avlyst/ }).nth(1).click();
  await page.getByRole("link", { name: /^(Lag lag|Nytt lagforslag)/ }).click();
  await expect(page).toHaveURL(/\/lag$/);
  await openFordeling(page);
  const sheet = page.getByRole("dialog", { name: "Fordeling" });
  await expect(sheet).toContainText("Bygger på lagforslagene fra");
  await sheet.getByRole("radio", { name: /Som sist/ }).check();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("same"));
  await sheet.getByRole("button", { name: "Bruk og fordel på nytt" }).click();
  await saved;
  await expect(page.locator(".nm-toast")).toContainText("fordelt på nytt");
  // Back to the default for the other tests.
  await openFordeling(page);
  await page.getByRole("dialog", { name: "Fordeling" }).getByRole("radio", { name: /Ikke bruk/ }).check();
  const reset = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes("off"));
  await page.getByRole("button", { name: "Bruk og fordel på nytt" }).click();
  await reset;
});

test("training plan: from the bank, approve, adjust with KI, PDF", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  const eventUrl = page.url().split("?")[0];
  await page.goto(`${eventUrl}/opplegg/endre`);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Legg til" }).first().click();
  // A new plan starts with the bank's warm-up exercise as the common warm-up.
  await expect(page.getByLabel("Felles oppvarming")).toHaveValue("b:sistemann-oppvarming");
  await page.getByRole("button", { name: /Lagre opplegget/ }).click();
  await expect(page).toHaveURL(/opplegg=/);
  await expect(page.getByText("Felles oppvarming: Sistemann med ball").first()).toBeVisible();
  await page.getByRole("button", { name: /Godkjenn versjon \d+/ }).click();
  await expect(page.locator(".nm-toast")).toContainText(/er godkjent/);
  await expect(page.getByLabel("Treningsopplegg").locator(".nm-badge", { hasText: "Godkjent" })).toBeVisible();

  await page.getByRole("link", { name: "Juster med KI" }).click();
  await page.getByLabel("Hva skal endres?").fill("Mer konkurranse");
  await page.getByRole("checkbox", { name: /Nymark Kunstgress 04 9er A/ }).check();
  await page.getByRole("button", { name: "Juster med KI" }).click();
  await expect(page).toHaveURL(/opplegg=/, { timeout: 30_000 });
  await expect(page.locator(".nm-toast")).toContainText(/laget med KI/);

  const href = await page.getByRole("link", { name: "Last ned PDF" }).getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // Today's session: the warm-up is the first exercise, for all teams.
  await page.goto(`${eventUrl}/dagens-okt`);
  await expect(page.locator(".nm-exercise summary").first()).toContainText("Felles oppvarming: Sistemann med ball");
});

test("training plan: reuse the plan of the training before", async ({ page }, info) => {
  await loginToEvents(page);
  // The plan test made a plan for the next training. Each project copies it to its own later training.
  await page.locator(".nm-event", { hasNotText: /Seriekamp|Avlyst/ }).nth(info.project.name === "mobil" ? 1 : 2).click();
  await expect(page).toHaveURL(/arrangementer\/E-/);
  await page.getByRole("link", { name: /^Bruk opplegget fra / }).click();
  await expect(page).toHaveURL(/opplegg\/endre\?fra=\d+/);
  await expect(page.locator(".nm-pick", { hasText: "fra forrige økt" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Lagre opplegget" }).click();
  await expect(page).toHaveURL(/opplegg=/);
  await expect(page.locator(".nm-toast")).toContainText("Versjon 1 er lagret");
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

  await page.goto("/g/G-FOTBALL/alle/trening/arshjul");
  // Months before this one are folded away below the coming ones.
  const january = page.getByRole("group", { name: "Januar" });
  if (!(await january.isVisible())) await page.locator("summary", { hasText: "Tidligere måneder" }).click();
  await january.getByLabel("Tema").fill("Pasning");
  await page.getByRole("button", { name: "Lagre årshjulet" }).click();
  await expect(page.locator(".nm-toast")).toContainText(/Årshjulet for \d{4} er lagret/);

  // «Sjekk mot NFF» links the month's own word to NFF's terms.
  await page.getByRole("link", { name: "Sjekk mot NFF" }).click();
  await expect(page.getByRole("heading", { name: "Sjekk mot NFF" })).toBeVisible();
  await expect(page.getByRole("row", { name: /^Jan/ })).toContainText("Pasning");
});

test("a year of the season plan set up with NFF's terms", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  const year = new Date().getFullYear() + 1;
  await page.goto(`/g/G-FOTBALL/alle/trening/arshjul?ar=${year}&oppsett=1`);
  await page.getByRole("radio", { name: /^NFFs begreper/ }).check();
  await page.getByRole("radio", { name: /^Hovedtema/ }).check();
  await page.getByRole("button", { name: /^(Lag årshjul for \d{4}|Lagre oppsettet)$/ }).click();
  await expect(page.getByText("NFFs begreper, hovedtema først.")).toBeVisible();

  const january = page.getByRole("group", { name: "Januar" });
  await january.getByRole("combobox", { name: "Hovedtema" }).selectOption({ label: "Spille oss framover i banen" });
  const point = january.getByRole("combobox", { name: "Læringsmoment", exact: true });
  await point.selectOption({ index: 1 });
  await expect(january.getByRole("combobox", { name: "Læringsmoment 2 (valgfritt)" })).toBeVisible();
  await page.getByRole("button", { name: "Lagre årshjulet" }).click();
  await expect(page.locator(".nm-toast")).toContainText(`Årshjulet for ${year} er lagret`);

  await page.getByRole("link", { name: "Sjekk mot NFF" }).click();
  await expect(page.getByRole("row", { name: /^Jan/ })).toContainText("Spille oss framover i banen");
});

test("the trainers link their own word to NFF's terms", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/alle/trening/arshjul");
  // This month comes first; the demo's theme for it is not in the app's word list.
  const month = page.locator(".nm-month").first();
  const box = month.getByRole("group", { name: /^Koblet til NFF for / });
  await box.getByRole("button", { name: /^(Velg|Endre) kobling$/ }).click();
  const tema = box.getByRole("checkbox", { name: "Spille oss framover i banen" });
  if (!(await tema.isChecked())) await tema.check();
  await box.getByRole("button", { name: "Lagre koblingen" }).click();
  await expect(page.locator(".nm-toast")).toContainText("er koblet til NFF");
  await expect(box.getByText("Bekreftet")).toBeVisible();
  await expect(box).toContainText("Hovedtema Spille oss framover i banen");
});

test("admin: save the team, and the training's pitches are chosen in the KI form", async ({ page }) => {
  await loginToEvents(page);
  await openNextTraining(page);
  const eventUrl = page.url().split("?")[0];
  await page.goto("/g/G-FOTBALL/alle/trening/laget");
  await expect(page.getByLabel("Fødselsår")).toHaveValue("2016");
  await expect(page.getByText(/^G\d+ \(født 2016\) · NFF-bånd/)).toBeVisible();
  // Pitches are set per weekday now, not in a list for the team.
  await expect(page.getByRole("checkbox", { name: /^Nymark Kunstgress 03 7er A/ })).toHaveCount(0);
  // Equipment per kind, vests per colour.
  await expect(page.getByLabel("Baller")).toHaveValue("20");
  await expect(page.getByRole("group", { name: "Utstyr" }).getByLabel("Blå")).toHaveValue("8");
  await page.getByLabel("Dukkemål").fill("6");
  await page.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(page.locator(".nm-toast")).toContainText(/Laget er lagret/);
  await page.reload();
  await expect(page.getByLabel("Dukkemål")).toHaveValue("6");

  await page.goto(`${eventUrl}/opplegg/ki`);
  const pitches = page.getByRole("group", { name: "Baner for økta" });
  // The training's pitches (the demo's fixed ones, or chosen earlier) are chosen already.
  const checked = pitches.getByRole("checkbox", { checked: true });
  await expect(checked.first()).toBeVisible();
  await expect(pitches.getByText(/^9er · Kunstgress/).first()).toBeVisible();
  const first = pitches.getByRole("checkbox").first();
  while ((await checked.count()) > 0) await checked.first().uncheck();
  await page.getByRole("button", { name: "Lag opplegg med KI" }).click();
  await expect(page.locator(".nm-alert")).toContainText("Velg minst én bane for økta.");
  await first.check();
  // Trainers who said yes in Spond are filled in; the trainer can change it.
  const coaches = page.getByLabel("Trenere på økta");
  await expect(page.getByText(/har svart ja i Spond|Ingen trenere har svart ja/)).toBeVisible();
  await coaches.fill("3");
  await page.getByRole("button", { name: "Lag opplegg med KI" }).click();
  await expect(page).toHaveURL(/opplegg=/, { timeout: 30_000 });
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

test("tag sheet: set a level and a player who plays well with them", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/g/G-FOTBALL/S-G2016/medlemmer");
  await page.locator(".nm-row-btn").first().click();
  const sheet = page.getByRole("dialog");
  const levels = sheet.getByRole("group", { name: "Nivå" });
  // The scale starts at 5: there is no button below it.
  await expect(levels.getByRole("button", { name: "4", exact: true })).toHaveCount(0);
  const nine = levels.getByRole("button", { name: "9", exact: true });
  const target = (await nine.getAttribute("aria-pressed")) === "true" ? "6" : "9";
  await levels.getByRole("button", { name: target, exact: true }).click();
  await expect(levels.getByRole("button", { name: target, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".nm-toast")).toContainText(`har nivå ${target}`);

  const add = sheet.getByRole("group", { name: "Legg til spiller" }).getByRole("button").first();
  const partner = ((await add.getAttribute("aria-label")) ?? "").replace(/^Legg til /, "");
  await add.click();
  await expect(page.locator(".nm-toast")).toContainText("spiller godt sammen");
  const remove = sheet.getByRole("button", { name: `Fjern ${partner}`, exact: true });
  await remove.click();
  await expect(remove).toHaveCount(0);
});

test("admin: the tags right can be turned off per trainer", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/trenere?lag=G-FOTBALL");
  const tags = page.getByLabel("Tagger for Emma Haugen");
  await expect(tags).toBeChecked();
  await tags.click();
  await expect(tags).not.toBeChecked();
  await tags.click();
  await expect(tags).toBeChecked();
});

test("admin: find trainers by name, group or team across main groups", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger/trenere?lag=G-FOTBALL");
  const rows = page.locator(".nm-table tbody tr");
  await page.getByLabel("Gruppe").selectOption({ label: "Nymark IL – Allidrett" });
  await expect(rows).toHaveCount(2);
  await expect(page.getByLabel("KI for Tom Berg")).toBeVisible();
  await page.getByLabel("Søk").fill("7-åringer");
  await expect(rows).toHaveCount(1);
  await expect(page.getByText("Viser 1 av")).toBeVisible();
  await page.getByLabel("Gruppe").selectOption({ label: "Alle grupper" });
  await page.getByLabel("Søk").fill("jenter 2015");
  await expect(page.getByLabel("KI for Emma Haugen")).toBeVisible();
  await expect(rows).toHaveCount(1);
  await page.getByLabel("Søk").fill("finnes ikke");
  await expect(page.getByText("Ingen trenere passer søket.")).toBeVisible();
});

test("settings show the version and «Hva er nytt»", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger");
  const link = page.locator("main").getByRole("link", { name: /Hva er nytt/ });
  await expect(link).toContainText(/Versjon \d+\.\d+\.\d+/);
  await link.click();
  await expect(page).toHaveURL(/\/innstillinger\/nytt/);
  await expect(page.getByRole("heading", { name: "Hva er nytt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Versjon 0\.1\.0/ })).toBeVisible();
  // PR numbers are for developers, not for the trainers.
  await expect(page.locator("main")).not.toContainText("(#");
});

test("settings link to the user guide, which also opens without login", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/arrangementer|velg-gruppe/);
  await page.goto("/innstillinger");
  await page.locator("main").getByRole("link", { name: /Bruksanvisning/ }).click();
  await expect(page).toHaveURL(/\/bruksanvisning\/index\.html$/);
  await expect(page.getByRole("heading", { name: "Bruksanvisning for trenere" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Last ned PDF" })).toBeVisible();
  await page.context().clearCookies();
  const res = await page.goto("/bruksanvisning");
  expect(res?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/bruksanvisning\/index\.html$/);
});
