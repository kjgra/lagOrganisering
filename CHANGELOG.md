# Versjonslogg

Alle merkbare endringer i appen står her, nyeste først.

Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.1.0/), og versjonsnumrene følger [semantisk versjonering](https://semver.org/lang/no/). Appen var på 0.x fram til repoet ble offentlig, og ble 1.0.0 da. Prosjektet er fortsatt eksperimentelt, så ting kan endre seg raskt.

Hver PR skriver endringene sine under «Ikke utgitt». Ved en ny versjon flyttes de til en ny overskrift, og `version` i `package.json` settes til det samme nummeret.

## [Ikke utgitt]

## [1.3.0] – 2026-11-01

KI bruker det appen har lært når den lager opplegg og øvelser.

### Lagt til

- «Erfaringer fra lignende økter» følger med hver KI-bestilling: øvelser som fungerer godt og dårlig for lagets aldersgruppe, problemer som går igjen med trenernes egne forslag, øvelser som ofte byttes ut, og det trenerne for aldersgruppen ofte ber om. Alltid med tallene bak, og bare det som har nok vurderinger fra flere trenere. Erfaringer fra én aldersgruppe brukes aldri for en annen.
- Ønsker fra andre lag brukes bare når minst to lag står bak, så ingen lag kan kjennes igjen.

### Endret

- Øvelsesbanken som sendes til KI, viser snittet for lagets aldersgruppe når det finnes nok vurderinger, og øvelser som er merket for aldersgruppen og passer gruppestørrelsen, kommer først.

## [1.2.0] – 2026-11-01

KI lærer hva trenerne ber om.

### Lagt til

- Ønskene til KI-opplegg og kommentarene på opplegg gjøres om til faste behov om natta, for eksempel «mindre kø», «færre spillere per gruppe» eller «må fungere med lite utstyr». Bare behovet lagres, ikke teksten.
- «Dette ber trenerne KI om» i Forbedringer: behov som går igjen per aldersgruppe, med hvor mange ganger og fra hvor mange trenere. Et behov vises først når flere trenere har bedt om det samme.

## [1.1.0] – 2026-11-01

Første steg mot en KI som lærer av hele økter, ikke bare enkeltøvelser.

### Lagt til

- «Trenere på økta» i «Lag opplegg med KI»: fylles ut med trenerne som har svart ja i Spond, og kan endres. KI lager ikke flere stasjoner som trenger en voksen enn det kommer trenere.
- Stikkord for hele økta i evalueringen: god progresjon, flyt mellom øvelsene, tid til organisering, aktivitet, mestring, om opplegget passet antall spillere og trenere, og om temaet kom fram. «Fortell om økta» fyller dem ut også.
- Hvert KI-opplegg lagres med hva det ble laget for: aldersgruppe, antall spillere og grupper, lengde, trenere, tema og ønsket til treneren. Det gjør at økter kan sammenlignes, slik at KI senere kan lære av økter som har fungert.

## [1.0.0] – 2026-10-31

Koden er offentlig. Felles øvelsesbank på tvers av grupper, og øvelser som forbedres per aldersgruppe.

### Lagt til

- Felles øvelsesbank: alle lag i appen, også i ulike hovedgrupper i Spond (for eksempel barne- og ungdomsfotball), ser og evaluerer de samme øvelsene. Evalueringer fra alle lagene teller når appen leter etter mønstre og lager forslag.
- Sperre mot doble øvelser: en ny øvelse som ligner for mye på en i banken (samme navn, eller nesten lik i innhold og tegning), blir ikke lagret. Juster den som finnes, eller lagre den nye som variant. Ved godkjenning av KI-opplegg vises hvilken øvelse den ligner på.
- Trenerlisten under Innstillinger viser trenere fra alle gruppene dine, med gruppe og lag, og du kan søke på navn, gruppe eller lag og filtrere på gruppe.
- Mønstre per aldersgruppe: «Dette sier trenerne» viser snitt per NFF-bånd, og et problem som bare kommer fra én aldersgruppe, vises som det («for 6–7 år»). Evalueringer fra øvelsesbanken teller for aldersgruppen til lagene dine.
- «Variant» i Forbedringer: fungerer en øvelse godt for én aldersgruppe og dårlig for en annen, foreslår appen en egen variant for den ene. «Bruk» legger den til i banken som en ny øvelse basert på den som finnes.
- Versjoner av øvelser: hver endring blir en ny versjon med eget snitt, og du kan gå tilbake til en tidligere versjon fra øvelsessiden.
- Appen går tilbake av seg selv når en ny versjon fra «Forbedringer» får klart dårligere vurderinger enn den før.
- «Små forbedringer» under KI-innstillinger: forslag som bare legger til linjer kan brukes automatisk (av som standard).

### Endret

- Koden ligger åpent på GitHub (MIT-lisens). Prosjektet er merket som eksperimentelt.

## [0.4.0] – 2026-10-31

Tilbakemeldinger fra trenerne gjør øvelsene bedre.

### Lagt til

- «Fortell om økta»: snakk eller skriv med egne ord, så fyller KI ut evalueringen for deg (#38).
- Påminnelse på telefonen om å evaluere etter trening (#39).
- Appen logger hva trenerne endrer i KI-forslag og øvelser, så KI kan lære av det (#40).
- «Dette sier trenerne»: observasjoner og mønstre per øvelse i øvelsesbanken (#41).
- «Forbedringer» under Trening: appen foreslår selv bedre øvelser når trenernes innspill viser et mønster, og du velger «Bruk», «Endre først» eller «Avvis». Trenerne får varsel når forslag venter (#43).
- «Hva er nytt» under Innstillinger, med versjonsnummeret under «Om appen».

### Endret

- Koden er MIT-lisensiert, klar for et offentlig repo (#42).

### Sikkerhet

- Demo-innlogging stoppes hvis appen er koblet til en ekte database, og loggen viser ikke hele databaseadressen (#42).

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
