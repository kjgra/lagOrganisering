# Bruksanvisning for trenere

Bruksanvisningen er én HTML-side som appen viser, og som GitHub Actions lager PDF av.

| Fil | Hva |
| --- | --- |
| `public/bruksanvisning/index.html` | Kilden. All tekst, og appversjonen på forsiden (`id="VERSJON"`). |
| `public/bruksanvisning/bilder/` | Skjermbilder fra den simulerte appen (oppdiktede navn). |
| `public/bruksanvisning/fonter/` | Barlow-fontene fra appen (OFL). |
| `scripts/bruksanvisning/skjermbilder.mjs` | Tar skjermbildene på nytt. |
| `scripts/bruksanvisning/lag-pdf.mjs` | Lager PDF-en fra HTML-siden. |
| `.github/workflows/bruksanvisning.yml` | Lager PDF-en i CI og publiserer den. |

## Hvor trenerne finner den

- **Nettside:** `/bruksanvisning` (Innstillinger → Bruksanvisning, og lenke på innloggingen). Åpen uten innlogging, og alltid i takt med versjonen som kjører, også i preview.
- **PDF:** knappen «Last ned PDF» på siden går til
  `https://github.com/kjgra/lagOrganisering/releases/download/bruksanvisning/bruksanvisning.pdf`.
  Workflowen «Bruksanvisning» lager den på nytt hver gang bruksanvisningen endres på `main`, og legger den på utgivelsen (release) `bruksanvisning`. «Skriv ut» på siden gir samme oppsett fra nettleseren.
- **PR:** når en PR endrer bruksanvisningen, ligger PDF-en som vedlegget `bruksanvisning` på kjøringen av workflowen. Endrer PR-en `app/` eller `components/` uten å endre bruksanvisningen, gir workflowen en advarsel (ikke feil).

## Regel

Hver PR som endrer noe trenerne ser, oppdaterer bruksanvisningen i samme PR: teksten, versjonen på forsiden (samme som `package.json`), og skjermbildene når de ikke lenger stemmer. En enhetstest sjekker at versjonen ikke er nyere enn appen, og at alle bildene i `bilder/` brukes og finnes.

## Oppdatere

1. Rett teksten i `public/bruksanvisning/index.html`, og sett versjonen på forsiden.
2. Nye skjermbilder (ved behov): `pnpm dev` uten `.env.local` (simulert), så `node scripts/bruksanvisning/skjermbilder.mjs` (alle) eller `node scripts/bruksanvisning/skjermbilder.mjs 02-arrangement 14-utstyr` (noen). Skriptet finner neste og forrige trening i demodataene selv. Et nytt bilde legges også inn i lista i skriptet.
3. Se på resultatet lokalt: `node scripts/bruksanvisning/lag-pdf.mjs` (krever `pnpm exec playwright install chromium`), eller på `/bruksanvisning` i `pnpm dev`.

Siden er laget for A4 ved utskrift og for mobil på skjerm. Fargene er kopiert fra `design/tokens.json`, fordi siden er en frittstående fil utenfor appens stilark.
