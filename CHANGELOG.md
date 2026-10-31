# Versjonslogg

Alle merkbare endringer i appen står her, nyeste først.

Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.1.0/), og versjonsnumrene følger [semantisk versjonering](https://semver.org/lang/no/). Appen er på 0.x fram til repoet blir offentlig, da blir den 1.0.0.

Hver PR skriver endringene sine under «Ikke utgitt». Ved en ny versjon flyttes de til en ny overskrift, og `version` i `package.json` settes til det samme nummeret.

## [Ikke utgitt]

## [0.4.0] – 2026-10-31

Tilbakemeldinger fra trenerne gjør øvelsene bedre.

### Lagt til

- «Fortell om økta»: snakk eller skriv med egne ord, så fyller KI ut evalueringen for deg (#38).
- Påminnelse på telefonen om å evaluere etter trening (#39).
- Appen logger hva trenerne endrer i KI-forslag og øvelser, så KI kan lære av det (#40).
- «Dette sier trenerne»: observasjoner og mønstre per øvelse i øvelsesbanken (#41).
- «Hva er nytt» under Innstillinger, med versjonsnummeret under «Om appen».

## [0.3.0] – 2026-10-27

Fordeling på lagtavla og trening per lag.

### Lagt til

- Trening per lag: laget, årshjul og «Slik trener vi» for hver undergruppe (#25).
- Fordeling på lagtavla: jevne lag eller nivådelt, med roller og par (#27).
- «Som sist» og «Rullér» i Fordeling, ut fra de forrige treningene (#28).
- «Bruk opplegget fra forrige trening» (#34).
- Kjøring av databasemigreringer fra GitHub, og en egen preview-database klonet fra prod (#31–#33).

### Endret

- Lagforslag kan redigeres også når de venter på eller har fått godkjenning (#29).
- Spillere som har meldt avbud fordeles ikke på lag. De som ikke har svart er tilgjengelige, men fordeles ikke automatisk (#30).
- Øvelsesbanken: «Ny øvelse med KI» er hovedknappen, og manuell oppretting er en lenke. Sonnet er standardmodell (#36).
- «Rullér» er standard i Fordeling (#37).
- «Juster øvelser med KI» er standard i øvelsesbanken (#35).

### Sikkerhet

- Next.js 16.4.3 og undici 8.12.3 (#26).

## [0.2.0] – 2026-10-24

Øvelsesbank med KI, baner og ny Trening-fane.

### Lagt til

- Taggtyper: nivå 1–5 og «spiller godt med», med styrt synlighet (#11).
- Baner fra Nymark idrettsanlegg, flere baner per lag og valg av bane per trening i KI-skjemaet (#12).
- Appen kan legges på hjemskjermen på iPhone (#13).
- Evaluer og endre øvelser direkte fra øvelsesbanken (#15, #16).
- «Ny øvelse med KI» i øvelsesbanken (#17).
- Lagets årskull: fødselsår og kjønn gir alder og NFF-bånd (#18).
- Øvelser tagges etter NFFs fagplaner, og KI bruker taggene (#23).
- Dagens økt, hurtignavigasjon, merker på opplegg og deling av lag (#21).

### Endret

- Lasteskjermer, angre, «Flytt til»-rad og kladd for lagforslag (#19).
- Innstillinger som liste, søk, årshjul-kort, tomme sider og overganger (#22).
- Trenerinnhold er flyttet fra admin til den nye Trening-fanen (#24).
- Kopiering fra test til prod tar med alt, også tagger og lagforslag (#8, #10).

## [0.1.0] – 2026-10-16

Første versjon, som erstatter Shiny-appen SpondNymark.

### Lagt til

- Innlogging med Spond, valg av gruppe og liste over arrangementer med påmeldte.
- Lagforslag med dra-og-slipp og trykk-for-å-flytte, gruppeutkast og godkjenning.
- Medlemmer med tagger.
- Treningsopplegg med tegninger, PDF, kommentarer, godkjenning og evaluering, laget selv eller med KI.
- Adminpanel, arkiv og innstillinger med lyst og mørkt tema.
- Automatiske tester (lint, typecheck, enhetstester, build og e2e) på hver PR (#7).

### Fikset

- Stjernemerket gruppe forsvant igjen (#5).
- Demokontoen er superadmin i simulert modus (#6).
