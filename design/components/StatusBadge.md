Viser svarstatus for en spiller («Kommer», «Ikke svart», «Kommer ikke») – alltid ikon + ord, aldri bare farge.

**Props:** `status: "kommer" | "ikke-svart" | "kommer-ikke"`. **shadcn/ui:** `Badge` med egne varianter.

- «Kommer»: hake-ikon, `success` på `success-bg`.
- «Ikke svart»: klokke-ikon, `warning` på `warning-bg`.
- «Kommer ikke»: kryss-ikon, `declined` på `declined-bg` – nøytral grå, ikke rød; det er et svar, ikke en feil.
- Svartall for et arrangement (`counts`): «✓ Kommer: 14 · ⏱ Ikke svart: 3 · ✕ Kommer ikke: 1», med en stablet måler under (grønn, skravert oransje, grå). Tallene er hovedinformasjonen; måleren er bare støtte.
- Tagger (`nm-tag`, shadcn `Badge variant="outline"`) er trenerens egne merkelapper på spillere: «Keeper», «Ny», «Venstrebein». Hold dem korte.
- Plasser merket helt til høyre i listeraden, slik at statusen står i samme kolonne nedover.
