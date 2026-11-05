# Versjonslogg

Alle merkbare endringer i appen står her, nyeste først.

Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.1.0/), og versjonsnumrene følger [semantisk versjonering](https://semver.org/lang/no/). Appen var på 0.x fram til repoet ble offentlig, og ble 1.0.0 da. Prosjektet er fortsatt eksperimentelt, så ting kan endre seg raskt.

Hver PR skriver endringene sine under «Ikke utgitt». Ved en ny versjon flyttes de til en ny overskrift, og `version` i `package.json` settes til det samme nummeret.

## [Ikke utgitt]

## [1.29.1] – 2026-11-05

### Fikset

- «Beregn pris» viser nå anslått pris for opplegget rett under knappen. Før sto bare lagets forbruk denne måneden der, så det så ut som om prisen var hele månedsforbruket. Forbruket står fortsatt, nå merket «Månedsbudsjett».

## [1.29.0] – 2026-11-05

Sjekk årshjulet mot NFF.

### Lagt til

- Ny knapp «Sjekk mot NFF» i årshjulet. Den viser hvor mange av NFFs hovedtema og delferdigheter for lagets aldersbånd årshjulet dekker, hvor mange måneder som er angrep og forsvar, hva som mangler, og hvilke måneder appen ikke kan koble til NFF. For hver måned står det hvor mange gode øvelser banken har. Hullene kan lastes ned som bestilling på nye øvelser.

## [1.28.0] – 2026-11-05

Egne temaer koblet til NFF.

### Endret

- Temaer med egne ord i årshjulet, som «Pasning og mottak», «Forsvarsspill» eller «Omstilling», kobles nå til NFFs hovedtema og delferdigheter for lagets aldersbånd. KI får koblingen og læringsmomentene som hører til (før fikk KI dem bare når temaet het det samme som et NFF-hovedtema), og øvelser tagget med de samme NFF-begrepene kommer først i katalogen KI velger fra. Ord som ikke kan kobles, som «Spilleforståelse», brukes som før.

## [1.27.1] – 2026-11-05

### Endret

- KI lar gruppene rullere mellom stasjonene når utstyret ikke rekker til alle samtidig, også om noen grupper da begynner med spill og slutter med Sjef over ballen. Først når utstyret ikke rekker selv med rullering, velger KI en variant som trenger mindre (f.eks. kjeglemål i stedet for dukkemål). Før var det motsatt.

## [1.27.0] – 2026-11-05

Bruksanvisningen i appen.

### Lagt til

- Bruksanvisningen for trenere ligger nå i appen under Innstillinger → Bruksanvisning, og som lenke på innloggingen. Den kan leses på mobilen, lastes ned som PDF eller skrives ut, og oppdateres sammen med appen, så den alltid stemmer med versjonen du bruker.

### Endret

- Bruksanvisningen er oppdatert med alt som er nytt siden versjon 1.8: faste baner og utstyr under Laget, bane på treningen, felles oppvarming, ny visning og evaluering i øvelsesbanken, rutenett og filtre på PC, dekning av fagplanen, Innsikt og personvernsiden. Nye skjermbilder.

## [1.26.1] – 2026-11-04

Bedre oversikt for de som utvikler appen.

### Endret

- Utviklerveiledningen i kodebasen er oppdatert med ordliste, miljøer og arbeidsregler. Ingen endring i appen.

## [1.26.0] – 2026-11-04

Varsel om ting som venter i admin.

### Lagt til

- Når det ligger tilbakemeldinger som venter på deg, viser tannhjulet et lite tall, og fanen «Tilbakemeldinger» i admin viser hvor mange. Tallet forsvinner når tilbakemeldingene er sendt til GitHub eller avvist, ikke bare når du har sett dem, slik at ingenting blir glemt. Skjermlesere leser opp hva som venter. Andre faner som trenger gjennomgang kan senere få samme varsel.

## [1.25.0] – 2026-11-04

Bedre valg av øvelser fra banken.

### Endret

- KI finner flere passende øvelser i banken. Øvelser som er tagget med øktas hovedtema, kommer først selv om temaet er skrevet med andre ord. Øvelser for nabobåndet (for eksempel 8–9 år for et 10–12-lag) kommer etter lagets eget bånd, og KI kan gjøre dem vanskeligere eller enklere slik at de passer.

## [1.24.0] – 2026-11-04

Utstyr per lag.

### Lagt til

- Under Trening › Laget kan dere nå fylle inn hvor mye utstyr laget har: baller, kjegler og markører, dukkemål, småmål (3er/5er), 7er-mål og vester per farge. Som resten av «Laget» gjelder det for laget, og en undergruppe uten egne innstillinger bruker hovedgruppas.
- KI får utstyret med antall og lager opplegg der øvelsene som pågår samtidig ikke trenger mer enn laget har. Mangler det, velger KI først en variant som trenger mindre, så NFFs rekkefølge (Sjef over ballen → Spille med og mot → Spill) holder, og ellers lar den gruppene starte på ulike stasjoner.

### Endret

- Fritekstfeltet «Utstyr» heter nå «Annet utstyr», for det som ikke har et eget tall.

## [1.23.0] – 2026-11-04

Faste baner per ukedag.

### Lagt til

- «Faste baner per ukedag» under Trening › Laget. Etter banefordelingen velger dere baner bare for dagene dere trener, f.eks. mandag og tirsdag, fra en dato. Når dere huker av for en dag, kan dere velge blant alle banene på Nymark, gruppert per hovedbane. De gjelder til neste endring, og dagene dere ikke velger, beholder banene sine. Hver banefordeling vises som ett kort med dagene, datoene og banene, og «Endre banefordelingen» endrer dager, datoer og baner samlet. Kommende banefordelinger er merket «Kommer», og utgåtte vises ikke.
- Sluttdato for de faste banene (når neste fordeling ventes). Tre uker før kommer en påminnelse på Trening › Laget og i arrangementslista. Etter sluttdatoen sier treningene fra om at de mangler bane, til nye faste baner er lagt inn.
- Arrangementet viser banene for treningen («fast for mandager»), og de kan endres for bare den treningen. Banene er valgt på forhånd i KI-skjemaet og i Hurtigopprett, og baner valgt der huskes for treningen.

### Endret

- Lista over lagets baner under Trening › Laget er fjernet. Banene settes nå per ukedag, og lagets baner er de faste banene som gjelder nå eller senere.
- Feltet «Merknad om baner» under Trening › Laget er fjernet, og KI bruker ikke lenger merknaden.

## [1.22.0] – 2026-11-04

NFF-katalogen i databasen.

### Lagt til

- Hovedtema, delferdigheter og læringsmomenter fra NFFs fagplaner ligger nå også i databasen, med de samme kodene som øvelsene er tagget med. Hvert lag kan legge til egne (for eksempel omstilling) og skjule punkter de ikke vil bruke. Et skjult punkt blir liggende, så øvelser som viser til det, beholder teksten.
- Årshjulet kan lagre hovedtema og opptil to læringsmomenter per måned ved siden av fritekstfeltene. Dette er grunnlaget for nedtrekk i årshjul, treningsopplegg og KI. Skjermbildene er ikke endret ennå.

## [1.21.0] – 2026-11-03

Dekning av fagplanen.

### Lagt til

- «Dekning av fagplanen» under Trening › Øvelser viser hvor godt øvelsesbanken dekker NFFs fagplan: et rutenett med aldersbånd, hovedtema og aktivitet (40 celler) med antall gode øvelser og kandidater i hver, og delferdighetene per aldersbånd. Trykk på en celle for å se øvelsene i den. «Last ned hullene» gir en liste over det som mangler, som bestilling på neste serie med øvelser.

## [1.20.2] – 2026-11-03

### Fikset

- Postgres-loggen i Supabase var full av feilen `schema "pg_pgrst_no_exposed_schemas" does not exist` (rundt 110 i timen). Den kommer fra Supabase sitt Data API, som appen ikke bruker. En migrering lager det tomme skjemaet `data_api_tom` uten rettigheter, og Data API skal nå bare eksponere det (`docs/publisering.md`).

## [1.20.1] – 2026-11-03

### Fikset

- Speed Insights er fjernet igjen, fordi den krever et Vercel-abonnement appen ikke har. Personvernsiden nevner den ikke lenger.

## [1.20.0] – 2026-11-03

Øvelsesbanken som rutenett på PC.

### Lagt til

- På en bred skjerm (PC og nettbrett på tvers) viser øvelsesbanken øvelsene som kort i et rutenett, hver med et lite bilde: tegningen øvelsen har, eller en enkel bane med kategoriens ikon når den ikke har noen. Over rutenettet kan du søke i navn og filtrere på aldersbånd, hovedtema, aktivitet, delferdighet, kategori og vurdering. Filtrene blir med når du åpner en øvelse og går tilbake. På mobil er banken en liste som før.

## [1.19.0] – 2026-11-03

Import av øvelser fra fil.

### Lagt til

- Importer øvelser fra fil (superadmin): under Trening › Øvelser kan superadmin laste opp en JSON-fil med øvelser. Først vises hva som blir lagt inn, og øvelser som finnes fra før, ligner for mye på en i banken eller har feil, hoppes over. Nye øvelser kommer inn som kandidater. Slik kan øvelser holdes utenfor koden i repoet.

## [1.18.0] – 2026-11-03

Bruker Vercel Pro.

### Lagt til

- Speed Insights: Vercel måler hvor raskt sidene laster på trenernes telefoner, uten informasjonskapsler og uten navn. Personvernsiden sier det.

### Endret

- Påminnelser etter trening sendes nå av Vercel Cron hvert kvarter i stedet for GitHub Actions, som ofte kom for sent eller hoppet over kjøringer. Workflowen «Påminnelser» kan fortsatt kjøres manuelt.

## [1.17.0] – 2026-11-03

Felles oppvarming fra øvelsesbanken.

### Lagt til

- Oppvarmingen kan være en øvelse fra banken (kategorien Oppvarming) som alle lagene gjør sammen før stasjonene. Velg den under «Felles oppvarming» øverst når du lager eller endrer et opplegg, før de andre øvelsene. Nye opplegg starter med den best vurderte oppvarmingsøvelsen, og KI velger også en når banken har noen. Øvelsen vises først i opplegget, i Dagens økt og i PDF-en, og tidsplanen viser navnet. Uten oppvarmingsøvelser i banken er oppvarmingen bare tekst som før (#74).

### Fikset

- «Ny øvelse med KI» beholder kategorien du velger, også når KI foreslår en annen. Før kunne en bestilt oppvarmingsøvelse havne i en annen kategori.

## [1.16.1] – 2026-11-03

Enklere tidsplan i Dagens økt.

### Endret

- Tidsplanen i Dagens økt viser ikke lenger hvilket lag som er på hvilken stasjon. Med stasjoner som roterer står det bare «Stasjoner, runde 1 av 3» osv., med «Nå» og «Neste» som før. Hele rulleringsplanen står fortsatt i opplegget og i PDF-en (#73).

## [1.16.0] – 2026-11-03

Offentlig demo som alltid er lik prod.

### Lagt til

- Demo-app: et eget Vercel-prosjekt med `APP_ENV=DEMO` kjører `main` med falsk Spond-innlogging, falske spillere og simulert KI, uten database. DEMO står ved logoen. Appen nekter å starte i demo hvis en database, KI-nøkkel eller GitHub-token er satt. Oppsett i `docs/publisering.md` avsnitt 11.

## [1.15.0] – 2026-11-03

Øvelsene er åpne data.

### Endret

- Øvelsene i øvelsesbanken er nå åpne data under CC BY-SA 4.0: alle kan bruke og endre dem, også kommersielt, men endrede utgaver må deles videre under samme lisens, så de kan ikke havne bak en betalingsmur. Koden er fortsatt MIT. Øvelsesbanken og hver øvelse viser lisensen, og skjemaene for nye og endrede øvelser sier at øvelsen deles under samme lisens når den lagres.

## [1.14.1] – 2026-11-03

Feilvakten følger også med på GitHub Actions og på om appen svarer.

### Lagt til

- Når en workflow feiler på `main` (CI, migreringer, påminnelser, analyse og de andre), lages en sak på GitHub med etiketten «auto-feil», lenke til kjøringen og de siste linjene av loggen. Samme feil gir bare én åpen sak.
- Helsesjekk hvert kvarter: svarer ikke appen etter tre forsøk, lages saken «Appen svarer ikke (helsesjekk)». Den lukkes av seg selv når appen svarer igjen.

## [1.14.0] – 2026-11-03

Feil i appen blir fanget opp automatisk.

### Lagt til

- Feilvakt: feil i appen, både på serveren og i nettleseren, samles i en feillogg under Admin → Feillogg (bare superadmin), med antall, side og versjon. Samme feil vises én gang. I prod blir en ny type feil automatisk en sak på GitHub med etiketten «auto-feil», uten navn, e-post eller id-er, høyst fem i døgnet. Kommer en feil tilbake etter at saken er lukket, lages en ny sak. Feil som ikke er sett på 90 dager, slettes av vedlikeholdet.
- Personvernsiden forteller om feilloggen og hvor lenge den lagres.
- Helsesjekk på `/api/helse`, som svarer med versjonen og om databasen svarer.

## [1.13.0] – 2026-11-03

Trykk på en øvelse i øvelsesbanken for å se den.

### Endret

- I øvelsesbanken viser et trykk på navnet nå selve øvelsen: tegning, organisering, gjennomføring, læringsmomenter og variasjoner, uten at noe kan endres ved et uhell. Derfra kan du evaluere, justere med KI eller endre øvelsen.
- Evaluering har fått sin egen knapp (skjema-ikonet) i lista, ved siden av stjernene for «Juster med KI». Før sendte et trykk på navnet deg rett til evalueringen.
- «Se øvelsen» fra et forbedringsforslag viser også øvelsen i stedet for å åpne redigeringen.

## [1.12.0] – 2026-11-02

Navn holdes utenfor databasen.

### Endret

- Tagger, kommentarer på lagforslag, navn på lagforslag og lag, prinsipper og lærdommer kan ikke inneholde navn på spillere eller trenere i gruppen. Appen lagrer bare Spond-ID-er og henter navnene fra Spond, og slik holder det seg. Skriv for eksempel «en av keeperne» i stedet.

## [1.11.0] – 2026-11-02

Personvernerklæring i appen.

### Lagt til

- Ny side /personvern som forklarer foreldre og trenere hva appen lagrer, hvorfor, hvor dataene er, hvor lenge de lagres og hvilke rettigheter de har. Siden er åpen uten innlogging, så den kan lenkes til fra Spond. Lenke fra innloggingen og fra Innstillinger. Fra Innstillinger kommer du tilbake dit med krysset øverst eller knappen nederst.

## [1.10.0] – 2026-11-02

Innsyn og sletting når en forelder eller trener ber om det.

### Lagt til

- Innstillinger → Personvern (superadmin): velg en spiller eller trener og se alt appen har lagret om personen, last det ned som JSON, eller slett det. For en spiller slettes nivå, tagger, par og plassen i lagforslag i gruppen. For en trener slettes tilganger, innstillinger og varsler, og det treneren har skrevet blir stående uten navn.

## [1.9.0] – 2026-11-02

Se om KI blir bedre.

### Lagt til

- Ny fane «Innsikt» i Forbedringer. Hovedtallet er hvor mange hurtigopplegg som ble godkjent uten at øvelser ble byttet. I tillegg vises andelen KI-øvelser som var med i det godkjente opplegget, og snittet for hele økta med og uten KI, per måned de siste seks månedene.
- Innsikt viser også øvelser som fungerer godt sammen per aldersgruppe (fra minst to lag) og om forslag fra Forbedringer ga høyere snitt enn versjonen før.
- Tallene gjelder alle lagene sammen. Det vises ingen navn eller tekst.

## [1.8.2] – 2026-11-02

Sidene henger ikke lenger på lastesiden, og etter «Ny øvelse med KI» kommer du rett tilbake til øvelsesbanken.

### Fikset

- Sider kunne bli stående på lastesiden i flere minutter, i prod og preview: KI-sidene, arrangementssiden («Påmeldte»), forsiden og innloggingen. Ofte virket første trykk, og så hang resten. En spørring mot databasen kunne stoppe halvveis gjennom Supabase sin pooler, og da ventet både databasen og appen på hverandre. Appen bruker nå en annen databasedriver (node-postgres) som sender hver spørring i ett stykke. En spørring som likevel tar mer enn 25 sekunder, gir nå en feilmelding i stedet for at siden henger, og neste trykk får en ny tilkobling.

### Endret

- Når KI er ferdig med en ny øvelse, går appen tilbake til øvelsesbanken og viser den nye øvelsen merket «Ny». Før åpnet den redigeringen av øvelsen, og du måtte trykke «Tilbake» to ganger for å komme til banken.
- Med simulert KI (test og preview) gir et ønske en ny eksempeløvelse hver gang, så «Ny øvelse med KI» kan prøves flere ganger uten å bli stoppet som «ligner for mye».

## [1.8.1] – 2026-11-02

«Ny øvelse med KI» virker igjen.

### Fikset

- «Ny øvelse med KI», «Juster med KI» og «Lag opplegg med KI» kunne feile med «Fikk ikke lagret» når banken hadde vurderinger per aldersgruppe. Databasen lagret JSON som tekst i stedet for som lister og objekter. Nå lagres JSON riktig, og det som allerede var lagret som tekst, gjøres om.
- Det samme gjorde at noe av det KI lærer av, ikke ble regnet med i prod: øktmønstre med rotasjon, minutter per stasjon og banene «Hurtigopprett» husker fra forrige gang.

## [1.8.0] – 2026-11-01

Opplysninger om spillere som har sluttet, slettes.

### Lagt til

- Nivå, tagger og «spiller godt sammen» for en spiller som har sluttet i gruppen i Spond, slettes etter 90 dager. Kommer spilleren tilbake før det, beholdes alt. Sjekken kjører når en trener logger inn, og står under Innstillinger → Vedlikehold.

## [1.7.0] – 2026-11-01

Forbedringer ser over hele øvelsesbanken, ikke bare øvelsene trenerne har kommentert.

### Lagt til

- «Ny øvelse»: Om natta ser appen etter hovedtemaer i NFF-fagplanen der en aldersgruppe som bruker appen har færre enn tre gode øvelser. KI lager da et forslag til en ny øvelse, merket med aldersgruppe og hovedtema. Med «Bruk» legges den i banken som kandidat.
- «Overlapp»: To nesten like øvelser gir et forslag om å arkivere den som er vurdert dårligst. Øvelsene slås aldri sammen av seg selv.
- «Mangler info»: Øvelser som mangler antall spillere, minutter, område, aktivitet, hovedtema eller aldersgruppe får et forslag som fyller inn bare det som mangler. Aldersgruppe hentes fra der øvelsen er vurdert godt, ikke fra KI.
- Alle forslagene venter i Forbedringer på «Bruk», «Endre først» eller «Avvis», som før. Et forslag fra trenernes evalueringer går foran et «Mangler info»-forslag for samme øvelse.

### Endret

- I Forbedringer vises NFF-tagger, aktivitet og aldersgruppe med navn i stedet for koder.

## [1.6.1] – 2026-11-01

Strammere sikkerhet rundt databasen.

### Sikkerhet

- Tilkoblingen til databasen er alltid kryptert (TLS).
- Ny databasebruker for appen med minst mulig rettigheter: den kan lese og skrive data, men ikke endre eller slette tabeller, og radtilgangen i databasen (RLS) gjelder. Tas i bruk ved å bytte bruker i `DATABASE_URL` (se docs/publisering.md).
- Sikkerhetshoder på alle sider: HTTPS påkrevd (HSTS), appen kan ikke bygges inn i andre sider, og nettleseren nekter kamera, mikrofon og posisjon.

## [1.6.0] – 2026-11-01

Si fra om feil og kom med forslag rett fra appen.

### Lagt til

- Ny knapp «Gi tilbakemelding» (snakkeboble) øverst ved tannhjulet, og under Innstillinger. Velg «Noe virker ikke» eller «Forslag» og skriv kort hva det gjelder. Siden du var på, appversjonen og hva slags enhet du bruker følger med, men ikke navnet ditt.
- Teksten stoppes hvis den har navn på spillere eller trenere, kontaktinfo eller helseopplysninger, siden den kan bli offentlig. Hver person kan sende fem tilbakemeldinger i døgnet.
- Superadmin får en innboks under Admin → «Tilbakemeldinger». Der kan teksten rettes før den sendes til GitHub som en sak, uten avsenderens navn. «Avvis» sletter tilbakemeldingen.

## [1.5.0] – 2026-11-01

KI lærer av hele økter, ikke bare enkeltøvelser.

### Lagt til

- Om natta telles vurderingene av «Hele økta» per aldersgruppe: hvilke øvelser som fungerer godt (eller dårlig) sammen, hvilken rekkefølge som fungerer, og hvordan økta er bygget opp (antall øvelser, stasjoner med rotasjon eller alle samlet). Rekkefølge læres bare av økter uten rotasjon, siden gruppene ellers tar stasjonene i ulik rekkefølge.
- Mønstrene følger med i «Erfaringer fra lignende økter» når KI lager opplegg, med tallene bak. Som før brukes bare det som har nok økter og trenere bak seg, og mønstre fra andre lag bare når minst to lag står bak.

## [1.4.1] – 2026-11-01

Personopplysninger holdes i EU.

### Sikkerhet

- Serverfunksjonene kjører i Dublin, ved siden av databasen i Irland. Data om spillere og trenere går ikke lenger via USA, og appen svarer raskere.
- Appen starter ikke i produksjon hvis databasen ligger utenfor Irland (`eu-west-1`).

## [1.4.0] – 2026-11-01

Lag og opplegg i ett trykk før trening.

### Lagt til

- «Hurtigopprett» på en trening uten lag og opplegg: KI lager lagforslag og treningsopplegg med lagets vanlige valg, uten flere instruksjoner. Antall lag blir som på forrige trening, ellers ett per trener som kommer, med 4–8 spillere per lag. Fordelingen følger «Fordeling», temaet er månedens tema i årshjulet, lengden er lagets standard og trenerne er de som har svart ja i Spond. Arket viser alt før du trykker «Lag alt», og prisen kan beregnes.
- Både lagene og opplegget lagres som utkast som du ser over og godkjenner. Går KI-delen galt, beholdes lagene.
- Banene du velger for et KI-opplegg huskes, så Hurtigopprett kan bruke dem neste gang.
- Endringer du gjør på et hurtigopplegg merkes for seg, så KI kan lære hva den burde gjort uten å bli bedt om det.

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
