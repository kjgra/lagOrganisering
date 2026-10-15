Innlogging med Spond-kontoen (e-post + passord), med tydelig beskjed om at passordet ikke lagres.

**Props:** `onSubmit({email, password})`, `error?: string`, `pending?: boolean`. **shadcn/ui:** `Card` (kun desktop), `Label`, `Input`, `Button`, `Alert variant="destructive"`.

- Øverst et mørkt felt (`chrome`) med logo og ordmerke i stor størrelse (`nm-brand--lg`).
- Mobil: skjemaet i full bredde på `surface`, marg `space-4`. Desktop (≥768px): kort på maks 420px, `surface-raised` på `surface`.
- Felt: `autocomplete="username"` og `"current-password"`, `inputmode="email"`; skriftstørrelse 18px så iOS ikke zoomer.
- Vis/skjul passord med ikonknapp (`aria-label` byttes mellom «Vis passord» og «Skjul passord»).
- Primærknapp «Logg inn» (gul pille), `control-lg`, full bredde. Under innlogging: «Logger inn …».
- Etter innlogging: GroupPicker første gang, ellers rett til EventList i sist brukte gruppe.
- Feil vises over feltene i `nm-alert` (`danger` på `danger-bg`, `role="alert"`): «Feil e-post eller passord. Sjekk og prøv igjen.»
- Personvernteksten står alltid synlig under knappen med lås-ikon: «Passordet ditt lagres ikke. Det sendes direkte til Spond én gang for å logge deg inn.» Teksten må stemme med hvordan backend faktisk håndterer passord og token.
- Ingen Spond-logo eller Spond-farger – appen er ikke Spond; vi skriver bare «Logg inn med Spond». I test-miljøet står «TEST»-merket ved logoen.
