// NFFs fagplaner for barnefotball (Planverk 2026 på tiim.no), som katalog øvelsene tagges med:
// hovedtema (spillfase), aktivitetskategori, delferdigheter og læringsmomenter per bånd.
// Hentet 2026-10-24 fra https://tiim.no/tema/fagplaner-og-spillmodeller. Teksten er NFFs,
// med åpenbare skrivefeil rettet. Endrer NFF planverket, oppdateres denne fila; koder som
// forsvinner, blir ignorert på øvelser som har dem.

import type { NffBand } from "./bands";

export type BandKey = NffBand["key"];
export const BAND_KEYS: BandKey[] = ["6-7", "8-9", "10-12"];

export const FAGPLAN_URLS: Record<BandKey, string> = {
  "6-7": "https://tiim.no/artikkel/fagplan-6-7-ar-treerfotball",
  "8-9": "https://tiim.no/artikkel/fagplan-8-9-ar-femmerfotball",
  "10-12": "https://tiim.no/artikkel/fagplan-10-12-ar-syverfotball-og-nierfoball",
};

export type Side = "angrep" | "forsvar";

export interface Hovedtema {
  /** Tag: `tema.<key>`. */
  key: string;
  label: string;
  side: Side;
  bands: BandKey[];
}

/** «Treningsøkta bør ha ett av følgende hovedtemaer fra start til slutt.» */
export const HOVEDTEMA: Hovedtema[] = [
  { key: "score-mal", label: "Score mål", side: "angrep", bands: ["6-7"] },
  { key: "hindre-mal", label: "Hindre mål", side: "forsvar", bands: ["6-7"] },
  { key: "spille-framover", label: "Spille oss framover i banen", side: "angrep", bands: ["8-9", "10-12"] },
  { key: "komme-til-avslutning", label: "Komme til avslutning, score mål", side: "angrep", bands: ["8-9", "10-12"] },
  { key: "vinne-ball", label: "Vinne ball, hindre motstander å spille forbi oss", side: "forsvar", bands: ["8-9", "10-12"] },
  { key: "hindre-avslutning", label: "Hindre avslutning, hindre mål", side: "forsvar", bands: ["8-9", "10-12"] },
];

export interface Aktivitet {
  key: string;
  label: string;
  /** Share of the session, the same for all bands. */
  share: string;
  laering: string;
}

/** Aktivitetskategoriene, i den rekkefølgen de kommer i økta. One per exercise. */
export const AKTIVITETER: Aktivitet[] = [
  { key: "sjef-intro", label: "Sjef over ballen – introduksjon", share: "25 % (sammen med repetisjon)", laering: "Teknisk: rolig tempo, få valg, trener på utførelsen (kropp, fot, balanse, rytme)" },
  {
    key: "sjef-repetisjon",
    label: "Sjef over ballen – repetisjon uten gjentagelse",
    share: "25 % (sammen med introduksjon)",
    laering: "Teknisk: samme ferdighet, med små endringer som tvinger fram tilpasning (retning, fart, sprett, avstand, tidspress, signal)",
  },
  { key: "med-og-mot", label: "Spille med og mot", share: "25–40 %", laering: "Teknisk og taktisk" },
  { key: "spill", label: "Spill / smålagsspill", share: "30–50 %", laering: "Teknisk og taktisk" },
];

export interface Delferdighet {
  /** Tag: `delf.<key>`. */
  key: string;
  label: string;
  side: Side;
  bands: BandKey[];
}

export const DELFERDIGHETER: Delferdighet[] = [
  { key: "foring", label: "Føring", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "vending", label: "Vending", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "dribling", label: "Dribling", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "pasning", label: "Pasning", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "mottak", label: "Medtak/mottak", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "skudd", label: "Skudd", side: "angrep", bands: ["6-7", "8-9", "10-12"] },
  { key: "heading", label: "Heading", side: "angrep", bands: ["8-9", "10-12"] },
  { key: "press", label: "Press/takling", side: "forsvar", bands: ["6-7", "8-9", "10-12"] },
  { key: "klarering", label: "Klarering", side: "forsvar", bands: ["8-9", "10-12"] },
  { key: "kampen-om-ballen", label: "Kampen om ballen", side: "forsvar", bands: ["6-7", "8-9", "10-12"] },
];

export const ROLES: Record<string, string> = { ballforer: "Ballfører", laget: "Resten av laget", "1f": "Førsteforsvarer (1F)" };

/** Groups of learning points («Før …», «Under …»), each a list of points. */
type Groups = Record<string, string[]>;

/**
 * Læringsmomenter per band. Keys: `<delferdighet>` or `<hovedtema>:<rolle>`.
 * Ids are `lm.<band>.<key with : as .>.<n>`, numbered from 1 through all groups.
 */
const LP: Record<BandKey, Record<string, Groups>> = {
  "6-7": {
    foring: {
      "Før føringen": ["Se opp om det er plass foran deg.", "Bestem deg for om du vil gå rett frem eller svinge."],
      "Under føringen": ["Bruk små, kontrollerte touch og ha ballen tett på foten din.", "Se opp av og til for å finne vei."],
      "Etter føringen": ["Spill til en venn eller gå mot mål.", "Hvis du mister ballen, prøv å vinne den tilbake."],
    },
    vending: {
      "Før vending": ["Se opp for å finne ledig plass.", "Bestem deg for hvilken vei du vil snu."],
      "Under vending": ["Før ballen fremover.", "Stopp ballen med innsiden, utsiden eller sålen av foten.", "Snu kroppen samme vei som ballen.", "Før ballen i den nye retningen."],
      "Etter vending": ["Løft blikket og se hvor motstandere, medspillere og målet er."],
    },
    dribling: {
      "Før dribling": ["Se opp for å finne plass å gå med ballen."],
      "Under dribling": ["Hold ballen nær foten.", "Lat som du går til en side, før du forter deg å gå til den andre siden."],
      "Etter dribling": ["Løft blikket.", "Spill videre til en venn eller gå mot mål."],
    },
    skudd: {
      "Før skudd": ["Se hvor målet er.", "Få ballen foran deg så du kan treffe den godt."],
      "Under skudd": [
        "Se på ballen når du treffer.",
        "Sett standfoten ved siden av ballen.",
        "Bruk innsiden for å sikte eller vrist for å skyte hardt.",
        "Fullfør bevegelsen med skuddfoten og land på skuddfoten.",
      ],
      "Etter skudd": ["Se om ballen gikk i mål.", "Vær klar for å skyte igjen hvis den kommer tilbake."],
    },
    pasning: {
      "Før pasning (for viderekomne)": ["Se etter en venn du kan sende ballen til.", "Stå vendt mot dit du skal sende ballen.", "Bestem deg for hvilken fot du skal bruke."],
      "Under pasning": ["Se på ballen når du treffer.", "Bruk innsiden av foten og treff midt på ballen.", "Spark ballen mot foten til vennen din."],
      "Etter pasning": ["Se om ballen kom frem.", "Gjør deg klar til å få den tilbake."],
    },
    mottak: {
      "Før mottak (for viderekomne)": ["Stå et sted der en medspiller kan sende ballen til deg.", "Vær vendt mot ballen.", "Si «ja!» eller «her!» når du vil ha ballen."],
      "Under mottak": ["Se på ballen når den kommer.", "Ta et lite og mykt første touch med innsiden eller sålen av foten.", "Hold ballen nær foten."],
      "Etter mottak": ["Løft blikket.", "Velg om du skal spille eller gå selv."],
    },
    press: {
      "Før press/takling": ["Løp mot spilleren som har ballen."],
      "Under press/takling": [
        "Kom deg nær ballen og motstanderen.",
        "Stå i veien så spilleren ikke kommer seg fremover.",
        "Prøv å ta ballen når motstanderen mister kontroll på ballen.",
      ],
      "Etter press/takling": [
        "Hvis du vinner ballen: prøv å drible og komme deg fremover til en skuddmulighet eller en pasningsmulighet.",
        "Hvis du blir passert: prøv å stå i veien for spilleren på nytt.",
      ],
    },
    "kampen-om-ballen": {
      "Før situasjonen": [
        "Følg med på hvor ballen går.",
        "Løp mot ballen, men stopp i tide slik at du ikke løper forbi.",
        "Stå med beina litt fra hverandre, klar til å flytte deg begge veier.",
      ],
      "Under situasjonen": ["Kom nær motstanderen uten å dytte.", "Hold kroppen lav og stabil.", "Se på ballen og prøv å stoppe motstanderen når ballen blir litt løs."],
      "Etter situasjonen": [
        "Hvis du vinner ballen, før den bort eller spill til medspiller.",
        "Hvis motstanderen får beholde ballen, følg etter og prøv igjen.",
        "Se deg rundt – hvor er lagkameratene dine?",
      ],
    },
    "score-mal:ballforer": {
      "Spille med og mot / spill": [
        "Få kontroll på ballen gjennom føre, vende, drible og skudd («meg og ballen»).",
        "Når spillerne mestrer dette: innlæring av pasning og mottak.",
      ],
    },
    "hindre-mal:laget": {
      "Spille med og mot / spill": [
        "Når laget har mistet ball, alle raskt tilbake på plass mellom ballfører (1A) og eget mål.",
        "Forsvarer nærmest ballfører (1F) må hurtig og tett opp i ballfører (1A) for å vinne ball.",
        "Ny forsvarer (2F) klar hvis første forsvarer (1F) blir passert.",
      ],
    },
  },
  "8-9": {
    mottak: {
      "Før medtak/mottak": [
        "Plasser deg slik at medspiller kan nå deg med en pasning uten å møte på blokkeringer.",
        "Frigjør deg fra motspiller med små bevegelser.",
        "Gi tydelig signal med stemme eller hånd når du ønsker å motta ballen.",
      ],
      "Under medtak/mottak": [
        "Se på ballen i trefføyeblikket.",
        "Motta ballen med foten din som er nærmest motstanders mål dersom du ikke er under hardt press.",
        "Første touch til ledig rom, bort fra motstander.",
      ],
      "Etter medtak/mottak": ["Løft blikket raskt.", "Velg neste handling (pasning, føring, skudd)."],
    },
    dribling: {
      "Før dribling": [
        "Se opp og vurder om det er rom foran deg eller om du må skape det.",
        "Bestem om du vil utfordre til høyre eller venstre.",
        "Plasser ballen litt foran eller på foten du vil bruke.",
      ],
      "Under dribling": ["Hold blikket opp så mye som mulig.", "Bruk hele kroppen til å finte (hofter, skuldre, blikk).", "Før ballen med foten som er lengst unna motstanderen."],
      "Etter dribling": ["Akselerer forbi motstanderen etter at du har passert.", "Løft blikket for å finne ny løsning."],
    },
    vending: {
      "Før vending": ["Orienter deg for å se om du skal vende.", "Velg retning ut fra hvor det er mest plass."],
      "Under vending": ["Bruk innside, utside eller såle for å snu ballen.", "Ha ballen nær foten og vend med kontroll.", "Bruk kroppen til å skjerme ballen i vendingen."],
      "Etter vending": ["Løft blikket og spill videre eller fortsett føringen.", "Sett fart i ny retning."],
    },
    pasning: {
      "Før pasning": [
        "Vurder om du kan nå en medspiller langt fremme i banen eller om du må spille til noen i nærheten.",
        "Velg pasningstype (kort, lang, høy, lav).",
      ],
      "Under pasning": [
        "Blikket opp før tilslag for å sikte.",
        "Treff midt på ballen for flat pasning, under for løft, siden for skru.",
        "Treff ballen med innsiden eller utsiden av foten for korte pasninger, vrist for lange pasninger i lufta.",
      ],
      "Etter pasning": ["Følg med på om pasningen lykkes.", "Beveg deg for å støtte angrepet eller vinne ballen tilbake."],
    },
    foring: {
      "Før føringen": ["Sjekk om det er åpent rom eller motstandere i nærheten.", "Velg retning og tempo ut fra situasjonen."],
      "Under føringen": [
        "Bruk små touch når det er trangt, lengre touch i åpent rom.",
        "Veksle mellom innside, utside og såle for å holde ballen unna motstandere.",
        "Hold blikket opp ofte.",
      ],
      "Etter føringen": ["Velg om du vil sentre, drible videre eller skyte.", "Hvis du mister ballen, prøv å vinne den tilbake."],
    },
    skudd: {
      "Før skudd": ["Se på mål og keeper for å finne plass å skyte.", "Velg skuddtype (innside for presisjon, vrist for kraft).", "Ta et kontrollert siste touch."],
      "Under skudd": [
        "Blikket på ballen i tilslaget.",
        "Treffpunkt på ballen: midt for rett skudd, under for å løfte, siden for skru.",
        "Følg gjennom med foten i retning av skuddet.",
      ],
      "Etter skudd": ["Følg opp returer med nytt skudd eller pasning.", "Omstill raskt om motstander vinner ballen."],
    },
    heading: {
      "Før heading": [
        "Se ballbanen tidlig og vurder fart og høyde.",
        "Bruk små steg for å plassere deg riktig.",
        "Bestem deg for om du skal klarere ballen vekk eller forsøke å styre headingen til en medspiller eller på mål.",
      ],
      "Under heading": [
        "Hopp til rett tid og møt ballen høyt.",
        "Se på ballen hele tiden.",
        "Treff ballen med panna.",
        "Bøy deg litt bakover før du støter overkroppen og hodet frem mot ballen.",
      ],
      "Etter heading": ["Land med balanse og føtter klare for neste aksjon.", "Orienter deg raskt for å se hvor ballen havner."],
    },
    press: {
      "Før press/takling": ["Se hvor ballen er på vei.", "Bestem om du vil presse innover eller utover.", "Start presset når du er nær nok til å påvirke."],
      "Under press/takling": [
        "Tilnærm deg kontrollert og senk farten.",
        "Stå sidevendt for å stenge den ene siden.",
        "Hold blikket på ballen, ikke på finter.",
        "Takle når ballen er litt for langt fra foten til ballføreren.",
      ],
      "Etter press/takling": ["Sikre ballen etter takling (pasning eller føring).", "Reis deg raskt om du faller.", "Finn ny posisjon om ballen spilles videre."],
    },
    klarering: {
      "Før klarering": [
        "Se deg rundt – hvor er motspillere og medspillere?",
        "Flytt føttene slik at du er klar til å reagere raskt.",
        "Bruk armene til å skjerme og holde balanse.",
      ],
      "Under klarering": [
        "Stå skrått – magen delvis mot motstanderens mål, delvis mot sidelinje.",
        "Bruk foten nærmest ballen for å klarere.",
        "Spark ballen høyt og langt.",
      ],
      "Etter klarering": ["Push ut sammen med laget.", "Orienter deg raskt igjen – finn ball og spillere.", "Snakk sammen og hjelp hverandre med ny posisjon."],
    },
    "kampen-om-ballen": {
      "Før situasjonen": [
        "Se hvor ballen havner og hvem som løper mot den.",
        "Kom raskt opp i riktig avstand – ikke for nært, ikke for langt unna.",
        "Stå lavt og klar til å reagere.",
      ],
      "Under situasjonen": [
        "Hold tett kontakt uten å miste balansen.",
        "Bruk kroppen klokt – vær sterk med skuldre og overkropp, men ikke dytte.",
        "Les motstanderens første touch – gå på hvis den blir for lang.",
        "Ta ut rommet mellom ball og motstander.",
      ],
      "Etter situasjonen": [
        "Hvis du vinner ballen, spill den til en trygg medspiller eller før fremover.",
        "Hvis du mister duellen, følg opp og press videre.",
        "Kommuniser med nærmeste lagkamerat.",
      ],
    },
    "spille-framover:ballforer": {
      "Før involvering": [
        "Være spillbar – ut av pasningsskygge.",
        "Skaffe seg oversikt over ledig rom/plass.",
        "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanderens mål.",
        "Riktig kroppsstilling og frekvens i beina før mottak.",
      ],
      "Under involvering med ball": [
        "Bevisst bruk av førsteberøring (skjerme, medtak).",
        "Korte hurtige touch med begge føtter.",
        "Utnytte rom fremover i banen ved å føre, drible eller «vennlig hilsen»-pasning.",
        "Riktig kroppsstilling og frekvens i beina ved håndtering av ball, føring og dribling.",
      ],
      "Etter involvering": ["Skaffe seg oversikt over ledig rom/plass for å gjøre seg spillbar."],
    },
    "spille-framover:laget": {
      "Spillbarhet/bevegelse": [
        "Ut av pasningsskyggen – «jeg vil ha ballen».",
        "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
        "Bevegelse for å skape og utnytte overtall sammen med ballfører.",
      ],
      "Vinkel/avstand": ["Gjøre oss store sammen i bredde og dybde.", "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ."],
    },
    "komme-til-avslutning:ballforer": {
      "Bevegelse – lage/utnytte rom": [
        "Utnytte rom fremover i banen – pasning med «vennlig hilsen».",
        "Overtallsspill og kombinasjoner for å spille seg igjennom (eks. veggspill).",
      ],
      "Komme til avslutning i boks": ["Bevegelser for å frigjøre seg: «fra – imot», «imot – fra».", "Oppsøk 1 mot 1: utfordre – spille/dra seg forbi."],
      Avslutningen: ["Først på ball.", "Plassering framfor kraft i avslutningen.", "Tålmodig – se på keeper, se på ball."],
    },
    "komme-til-avslutning:laget": {
      "Spillbarhet/bevegelse": [
        "Ut av pasningsskyggen – «jeg vil ha ballen».",
        "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål. Klar for retur fra keeper.",
        "Bevegelse for å skape og utnytte overtall sammen med ballfører.",
      ],
      "Vinkel/avstand": ["Gjøre oss store sammen i bredde og dybde.", "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ."],
    },
    "vinne-ball:1f": {
      "Før involvering": ["Oversikt over ball, med- og motspillere.", "Kommer ballfører i stor eller liten fart, eller har ryggen til?"],
      "Under involvering": [
        "Se på ball, og vurdere ballførers fart og ferdigheter.",
        "Komme tett i press med rett fart og opprettholde presset med riktig kroppsstilling og korte, raske steg.",
        "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning.",
      ],
      "Etter involvering": ["Skaffe seg oversikt på nytt: er du fortsatt 1F?", "Presse på nytt om mulig.", "Raskt på «rett side» av ball når pressejobben er over."],
    },
    "vinne-ball:laget": {
      Forflytning: [
        "Reagere hurtig sammen når 1F går for å vinne ball.",
        "Ved balltap: fortest mulig få flest mulig på rett side av ball.",
        "Kontroll på farlige rom ved flest mulig spillere på rett side av ball.",
      ],
      Avstand: [
        "Korte avstander mellom spillere i lengden.",
        "Små avstander mellom spillere i bredden.",
        "Jo tettere press, jo kortere avstander.",
        "Ta ansvar for spillere foran oss.",
      ],
    },
    "hindre-avslutning:1f": {
      "Posisjonering/press – nekte rom": [
        "Komme seg på rett side mellom ball og eget mål.",
        "Kontroll på farlige rom ved å posisjonere seg for å komme tett eller snappe/takle/vinne ball.",
      ],
      "Nekte avslutning": [
        "Komme tett og presse, se på ball.",
        "Offervilje – først på ball.",
        "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning.",
        "Holde feilvendte spillere feilvendt, armlengdes avstand.",
      ],
      "Håndtere avslutning": [
        "Keeper er posisjonert og er skuddklar.",
        "Opp i blokk: blokke med fremsiden av kroppen.",
        "Alle i «beredskap» frem til ballen er ute av boksen – jakte returer.",
      ],
    },
    "hindre-avslutning:laget": {
      "Posisjonering/press – nekte rom": [
        "Komme seg på rett side mellom ball og eget mål.",
        "Kontroll på farlige rom ved å posisjonere seg for å komme tett eller snappe/takle/vinne ball.",
      ],
      "Nekte avslutning": [
        "Komme tett og presse, se på ball.",
        "Offervilje – først på ball.",
        "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning.",
        "Holde feilvendte spillere feilvendt, armlengdes avstand.",
      ],
      "Håndtere avslutning": [
        "Keeper er posisjonert og er skuddklar.",
        "Opp i blokk: blokke med fremsiden av kroppen.",
        "Alle i «beredskap» frem til ballen er ute av boksen – jakte returer.",
      ],
    },
  },
  "10-12": {
    mottak: {
      "Før medtak/mottak": [
        "Velg riktig vinkel og avstand til pasningslegger.",
        "Frigjør deg fra markering med fra-imot-bevegelse eller tempoendring.",
        "Halvåpen kroppsstilling for å se både ball og neste trekk.",
        "Orienter deg for å vite om du er under press.",
      ],
      "Under medtak/mottak": [
        "Sjekk rommet på nytt mens ballen er på vei.",
        "Bruk kroppen til å skjerme ballen.",
        "Tilpass touchens lengde til situasjonen (kort ved press, lengre i åpent rom).",
      ],
      "Etter medtak/mottak": ["Blikk opp umiddelbart for å spille, drible eller skyte.", "Fortsett å skjerme ballen om presset kommer."],
    },
    dribling: {
      "Før driblingen": [
        "Les situasjonen og vurder rom, motstandere og medspillere.",
        "Bestem om du skal drible rett inn i et ledig rom eller om du må utfordre direkte mot en forsvarsspiller for å trekke på deg press først.",
      ],
      "Under driblingen": [
        "Kombiner blikk opp med kontroll på ballen.",
        "Utfør finten med store, troverdige bevegelser og tempo for å passere.",
        "Skjerm ballen med kroppen og bruk riktig fot for situasjonen.",
      ],
      "Etter driblingen": ["Skap avstand etter passering.", "Velg raskt neste handling (pasning, skudd, videre føring).", "Fortsett å beskytte ballen hvis presset fortsetter."],
    },
    vending: {
      "Før vending": ["Orienter deg tidlig for å se medspillere, motspillere og rom.", "Velg vendingsmetode (innside, utside, såle, med finte)."],
      "Under vending": [
        "Utfør vending med riktig fotdel i forhold til press og rom.",
        "Bruk tempoendring eller finte for å riste av deg motstander.",
        "Skjerm ballen med kroppen under vending.",
      ],
      "Etter vending": ["Akselerer i ny retning for å utnytte rommet.", "Løft blikket og velg neste handling (pasning, skudd, ny dribling)."],
    },
    pasning: {
      "Før pasning": [
        "Se først etter pasningsalternativer fremover i banen før du ser etter alternativer sideveis eller bakover.",
        "Vurder medspillerens bevegelse og rommet rundt.",
      ],
      "Under pasning": ["Kombiner blikk opp med presist tilslag.", "Tilpass kraft og retning etter situasjonen."],
      "Etter pasning": ["Les spillet videre og posisjoner deg for neste trekk.", "Omstill raskt til forsvar om pasningen brytes."],
    },
    foring: {
      "Før føringen": ["Les rommet foran deg og rundt deg.", "Velg retning, tempo og plan for neste trekk."],
      "Under føringen": ["Tilpass touchlengde til tempo og press.", "Veksle fot og fotdel for å beskytte ballen.", "Bruk kroppen for å skjerme mot press."],
      "Etter føringen": ["Velg neste handling raskt (pasning, dribling, skudd).", "Omstill raskt til forsvar om du mister ballen."],
    },
    skudd: {
      "Før skudd": [
        "Vurder avstand, vinkel og keeperens posisjon.",
        "Velg skuddtype (bredside, vrist, volley, halvsprett).",
        "Juster kroppsstilling og balanse for presist tilslag.",
      ],
      "Under skudd": [
        "Kombiner blikk opp før skudd med fokus på ball i tilslaget.",
        "Treffpunkt på ballen: midt for rett skudd, under for å løfte, siden for skru.",
        "Følg gjennom med foten i retning av skuddet.",
      ],
      "Etter skudd": ["Vær klar for returer og nye muligheter.", "Omstill raskt til forsvar om motstander får kontroll."],
    },
    heading: {
      "Før heading": [
        "Les ballbanen tidlig for å velge posisjon.",
        "Bruk korte forberedende steg og senk tyngdepunktet for å gjøre klar til å ta sats.",
        "Velg intensjon (klarere, avslutte, legge igjen).",
      ],
      "Under heading": [
        "Bruk trestegssats om nødvendig for å hoppe høyt.",
        "Møt ballen på høyeste punkt.",
        "Stuss med toppen av hodet eller styr ballen i ønsket retning med panna.",
        "Bruk hele overkroppen for å få kraft.",
      ],
      "Etter heading": ["Land kontrollert og forberedt på neste situasjon.", "Vær klar til å vinne andreball eller gå i ny posisjon."],
    },
    press: {
      "Før press/takling": [
        "Les situasjonen: se ballførerens retning og lagets balanse. Er laget i ubalanse, prioriter å ikke bli driblet. Er laget i balanse, gå for å vinne ballen.",
        "Velg pressretning (lede innover/utover).",
        "Beregn avstand og tidspunkt for press.",
      ],
      "Under press/takling": [
        "Kombiner sidevendt kroppsstilling med lavt tyngdepunkt.",
        "Bruk armer til balanse og romfølelse uten å lage frispark.",
        "Hold blikket på ballen, ikke på finter.",
        "Takle når ballen er litt for langt fra foten til ballføreren.",
      ],
      "Etter press/takling": ["Sikre ballen etter takling (pasning eller føring).", "Reis deg raskt om du faller.", "Finn ny posisjon om ballen spilles videre."],
    },
    klarering: {
      "Før klarering": [
        "Orienter deg tidlig – vurder hvor ballen havner og hvor du bør stå.",
        "Juster posisjonen og fotarbeidet for god timing.",
        "Bruk armene aktivt for å holde motstandere unna.",
      ],
      "Under klarering": [
        "Stå skrått i forhold til ballbanen – magen delvis mot motstanderens mål, delvis mot sidelinje.",
        "Bruk foten nærmest ballen, og treff midt på for kraft og høyde.",
        "Prioriter sikkerhet – klarer bort først, så spill.",
      ],
      "Etter klarering": ["Push laget ut.", "Orienter deg og se etter neste situasjon.", "Ta ordet – reorganiser og gi beskjed om posisjoner."],
    },
    "kampen-om-ballen": {
      "Før situasjonen": [
        "Orienter deg tidlig – vurder hvor ballen havner og om du kan nå den først.",
        "Juster farten slik at du ankommer situasjonen med balanse.",
        "Bruk armene til å holde avstand og stabilitet.",
      ],
      "Under situasjonen": [
        "Oppretthold tett kontakt – ikke la motstanderen snu opp.",
        "Finn riktig balanse – lavt tyngdepunkt, aktiv overkropp.",
        "Les motstanderens touch og utnytt det første dårlige touchet.",
        "Ta ut rommet mellom ball og motstander.",
      ],
      "Etter situasjonen": [
        "Reager raskt – enten sikre ballen eller fortsett presset.",
        "Juster posisjon og hjelp laget å samle seg bak ballen.",
        "Kommuniser tydelig – hvem presser, hvem sikrer.",
      ],
    },
    "spille-framover:ballforer": {
      "Før involvering": [
        "Være spillbar – ut av pasningsskyggen.",
        "Orientert om ledige rom fjernt og nært.",
        "Spillbar gjennom riktig avstand og vinkel til ballfører.",
        "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
        "Riktig kroppsstilling og frekvens i beina ved forflytninger før mottak.",
      ],
      "Under involvering med ball": [
        "Ro (med ball), åpne (i førstetouch) og true (med blikk og fot).",
        "Utnytte rom fremover i banen ved å føre, drible eller pasning.",
        "Korte hurtige touch med begge føtter for å utnytte rom / skape overtall med føring.",
        "Skape nye rom gjennom pasninger med riktig fart på ball til riktig fot.",
        "Tenke mønstre som «opp – tilbake – igjennom» og «fra trangt – til ledig».",
        "Riktig kroppsstilling og frekvens i beina ved håndtering av ball, føring og dribling.",
      ],
      "Etter involvering": [
        "Hurtig få ny oversikt etter pasning.",
        "Ny aksjon umiddelbart for å gjøre seg spillbar og / eller lage rom.",
        "Være forberedt på å stille om fra angrep til forsvar.",
      ],
    },
    "spille-framover:laget": {
      "Spillbarhet/bevegelse": [
        "Bevegelse bak ballfører for å støtte / vende spill.",
        "Bevegelse forbi upresset ballfører for å skape spillpunkter.",
        "Bevegelse av spillere foran – true ulike rom samtidig.",
        "Bevegelse for å skape og utnytte overtall sammen med ballfører.",
        "True flere rom samtidig med bevegelse og posisjon.",
      ],
      "Vinkel/avstand": [
        "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
        "Gjøre oss store sammen i bredde og dybde.",
        "Gode avstander mellom spillere i ledd og mellom ledd.",
        "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ.",
        "Angripe hurtig fremover. Søke å spille kontrollert inn i (1) bakrom, (2) mellomrom sentralt eller (3) rettvendt i sidekorridor.",
        "Beholde oversikt med ball i beina og kunne ombestemme valg.",
        "Hurtige pasningsvalg eller føre ball i stor fart for å utnytte rom med korte hurtige touch og oversikt.",
        "Utnytte ubalanse gjennom føring i fart, utfordre på, «ta kommandoen».",
        "Oversikt og ballkontroll i små rom / under press for å spille fremover eller vende spill.",
        "Opprettholde eller forsterke ubalanse gjennom temposkifte når vi er i prioritert rom.",
        "Ny aksjon umiddelbart for å gjøre seg spillbar på nytt og / eller skape rom.",
      ],
    },
    "komme-til-avslutning:ballforer": {
      "Komme til avslutning i boks": [
        "Bevegelser for å komme først på ballen: sprint, stå i ro, «fra – imot», «imot – fra».",
        "Se med- og motspillere – utnytt rom i forsvarende lag.",
        "Posisjonere seg på «blindside».",
        "Pasning igjennom med «vennlig hilsen» (på rett fot til rett tid med rett kraft).",
        "Korte tette touch for å utfordre, spille eller dra seg forbi. På jakt etter skuddmuligheter.",
      ],
      Avslutningen: [
        "Tålmodig – holde avslutningsrom åpent.",
        "Plassering framfor kraft i avslutningen.",
        "Kort tid mellom nest siste touch og avslutning.",
        "Se på keeper, så på ball.",
        "Avslutte hurtig når det er trangt (dårlig sikt for keeper, ball kan skifte retning).",
      ],
      "Innlegg og «45»: innlegget/siste pasning": [
        "Oversikt over trusler 1. stolpe, bakre stolpe og «45» og utnytte farligste rom til rett tid.",
        "Tidlige innlegg – slå på «ryggsiden» av førsteforsvarer.",
        "Slå innlegg i rom som angripes (ofte forbi første forsvarsspiller i boks).",
        "Beholde oversikt med ball i beina, finne rett timing og kunne kamuflere valg.",
      ],
      "Innlegg og «45»: avslutningen": ["Først på ball!", "Skudd/heading tilbake i det hjørnet ballen kom fra er ofte lurt."],
    },
    "komme-til-avslutning:laget": {
      "Bevegelse – lage/utnytte rom": [
        "Trusler inn i bakrom.",
        "Søke å spille igjennom før rundt.",
        "Samtidige, truende og eksplosive bevegelser.",
        "Benytte veggspill og kombinasjoner for å spille seg igjennom.",
        "Riktig kroppsstilling og frekvens i beina i utgangsposisjoner og ved forflytninger.",
      ],
      "Komme til avslutning i boks": [
        "Bevegelser for å komme først på ballen: sprint, stå i ro, «fra – imot», «imot – fra».",
        "Se med- og motspillere – utnytt rom i forsvarende lag.",
        "Posisjonere seg på «blindside».",
      ],
      "Innlegg og «45»: spillbarhet/bevegelse": [
        "Samtidige, truende og eksplosive bevegelser. True ulike rom.",
        "True 1. stolpe, bakre stolpe og «45».",
        "Timing = lese ballførers blikk og touch.",
        "Flest mulig trusler innenfor stengene.",
        "Tålmodig – holde avslutningsrom åpent.",
        "Plassere seg i blindsiden til motstander.",
      ],
    },
    "vinne-ball:1f": {
      "Før involvering": [
        "Oversikt over ball, med- og motspillere.",
        "Vurdere om vi er «i press» eller «kontrollerer rom».",
        "Velge pressøyeblikk ut ifra avstand, motstanders kroppsposisjon, blikk, fot og touch.",
        "Kroppskontroll – kontroll på overkroppen i utgangsposisjoner for raskt å kunne gå i alle retninger.",
      ],
      "Under involvering": [
        "Komme tett i press med rett fart og opprettholde presset med riktig kroppsstilling og høy frekvens i beina.",
        "Bevisst på rom rundt seg for å stenge avspillpunkter.",
        "Kroppskontroll og fart i beina – kontroll på overkroppen ved forflytninger. Aktiv armbruk ved duellspill og kroppskontakt.",
        "Tett i ballfører for å vinne ball eller tvinge frem en upresis pasning.",
        "Utnytte dårlige, lange og for mange touch.",
      ],
      "Etter involvering": ["Skaffe seg oversikt på nytt, er du fortsatt 1F?", "Presse på nytt om mulig.", "Raskt på «rett side» av ball når pressejobben er over."],
    },
    "vinne-ball:laget": {
      Forflytning: [
        "Posisjonering i forhold til ball og medspillere, ikke motspillere – soneforsvar.",
        "Ved balltap: gjenvinning eller fortest mulig få flest mulig på rett side av ball.",
        "Reagere hurtig og samlet på definerte pressignaler som støttepasning, dårlig touch, feilvendte spillere, ball til back.",
        "Kontinuerlig justering av høyde i forhold til ballfører, lese fot, blikk, kroppsposisjon og trusler.",
        "Senke oss samlet og ha kontroll på farlige rom dersom vi mister ball / ikke har press på ballføreren.",
      ],
      Avstand: [
        "Hurtig komme til definerte utgangsposisjoner, med rett kroppsstilling for å ha kontroll på rom og klare for å presse.",
        "Korte avstander mellom spillere i lengden og bredden.",
        "Jo tettere press, jo kortere avstander.",
        "Pressansvar for spillere foran oss i hver vår sone når vi presser høyt.",
      ],
    },
    "hindre-avslutning:1f": {
      "Hindre avslutning": [
        "Komme tett og presse – se på ball.",
        "Kontroll på overkropp og alltid en fot i bakken – korte ned stegene inn i press.",
        "Stresse ballfører; forsøke å vinne ball, oppholde og / eller lede vekk fra mål.",
        "Ta rommet mellom ballfører og ball før man tar ball.",
        "Hold feilvendte spillere feilvendt – armlengdes avstand.",
      ],
      "Håndtere avslutning": [
        "Keeper er posisjonert og er skuddklar.",
        "Opp i blokk, blokke med fremsiden av kroppen.",
        "Stenge av ett hjørne – keeper tar det andre (aldri skudd mellom beina).",
      ],
      "Innlegg og «45»: posisjonering/press – nekte rom": [
        "Blokkere eller hindre innlegg/pasning.",
        "Tvinge eventuelt innlegg foran spiller i press.",
        "Sidestilt kroppsstilling så man ser ball og motstandere.",
        "Hurtig i posisjon mellom eget mål og motstander.",
        "Ta kontroll foran eget mål gjennom posisjonering innenfor stolpene.",
        "Spillere på feil side skal komme seg på rett side.",
      ],
      "Innlegg og «45»: hindre avslutning": [
        "Oversikt over trusler mot 1. stolpe, bakre stolpe og «45» og kontroll på farligste rom.",
        "Posisjon mellom motstander og mål.",
        "Offervilje – først på ball.",
        "«Ta duellen før duellen» – gå i kropp for å ta bort timing og fart hos motspiller.",
      ],
      "Innlegg og «45»: håndtere avslutning": [
        "Tverrvende og inn i press på nytt bakfra hvis mulig.",
        "«På plass» igjen når pressejobben er ferdig.",
        "Komme på rett side igjen hvis man er passert og utenfor presseavstand.",
        "Være mentalt forberedt på å omstille fra forsvar til angrep.",
      ],
    },
    "hindre-avslutning:laget": {
      "Hindre avslutning": [
        "Sidestilt kroppsstilling så man ser ball og motstandere.",
        "Hurtig i posisjon mellom eget mål og motstander.",
        "Ta kontroll foran eget mål gjennom posisjonering innenfor stolpene.",
        "Spillere på feil side skal komme seg på rett side.",
        "Hold feilvendte spillere feilvendt – armlengdes avstand.",
      ],
      "Håndtere avslutning": [
        "Keeper er posisjonert og er skuddklar.",
        "Opp i blokk, blokke med fremsiden av kroppen.",
        "Stenge av ett hjørne – keeper tar det andre (aldri skudd mellom beina).",
        "Alle i «beredskap» frem til ballen er ute av boksen.",
        "Spillere som ikke har markering/blokker – beskytt målet.",
      ],
      "Innlegg og «45»: hindre avslutning": [
        "Blokkere eller hindre innlegg/pasning.",
        "Oversikt over trusler mot 1. stolpe, bakre stolpe og «45» og kontroll på farligste rom.",
        "Offervilje – først på ball.",
        "«Ta duellen før duellen» – gå i kropp for å ta bort timing og fart hos motspiller.",
        "Markere og ha kontroll på farlige rom helt til situasjonen er avklart. Når motstander ikke når ball, ta dem likevel ut for å skaffe rom til keeper.",
      ],
    },
  },
};

export interface LearningPoint {
  /** Tag, e.g. `lm.8-9.spille-framover.ballforer.3` or `lm.10-12.pasning.2`. */
  id: string;
  band: BandKey;
  /** A hovedtema or delferdighet key. */
  topic: string;
  /** For hovedtema: ballforer, laget or 1f. */
  role: string | null;
  group: string;
  text: string;
}

export const LEARNING_POINTS: LearningPoint[] = BAND_KEYS.flatMap((band) =>
  Object.entries(LP[band]).flatMap(([key, groups]) => {
    const [topic, role = null] = key.split(":");
    let n = 0;
    return Object.entries(groups).flatMap(([group, texts]) =>
      texts.map((text) => ({ id: `lm.${band}.${topic}${role ? `.${role}` : ""}.${++n}`, band, topic, role, group, text })),
    );
  }),
);

const BY_ID = new Map(LEARNING_POINTS.map((p) => [p.id, p]));

export const temaTag = (key: string) => `tema.${key}`;
export const delfTag = (key: string) => `delf.${key}`;

export function learningPoint(id: string): LearningPoint | undefined {
  return BY_ID.get(id);
}

/** The label of a tag, or undefined for a code the catalog does not know (any more). */
export function tagLabel(tag: string): string | undefined {
  if (tag.startsWith("tema.")) return HOVEDTEMA.find((t) => temaTag(t.key) === tag)?.label;
  if (tag.startsWith("delf.")) return DELFERDIGHETER.find((t) => delfTag(t.key) === tag)?.label;
  return BY_ID.get(tag)?.text;
}

export const isKnownTag = (tag: string) => tagLabel(tag) !== undefined;

export const aktivitetLabel = (key: string) => AKTIVITETER.find((a) => a.key === key)?.label;

/** The hovedtema in a band that a free-text theme («Spille oss framover») most likely means. */
export function matchHovedtema(theme: string, band: BandKey): Hovedtema | undefined {
  const norm = (x: string) =>
    x
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, " ")
      .replace(/fremover/g, "framover")
      .replace(/\s+/g, " ")
      .trim();
  const t = norm(theme);
  if (!t) return undefined;
  const inBand = HOVEDTEMA.filter((h) => h.bands.includes(band));
  return inBand.find((h) => norm(h.label) === t) ?? inBand.find((h) => norm(h.label).startsWith(t) || t.startsWith(norm(h.label).split(" ").slice(0, 3).join(" ")));
}

/** «8–9, 10–12 år · Spille med og mot · Spille oss framover i banen» for lists; empty when untagged. */
export function nffSummary(e: { bands: BandKey[]; nff_activity: string; nff_tags: string[] }): string {
  const temaer = e.nff_tags.filter((t) => t.startsWith("tema.")).map(tagLabel).filter(Boolean);
  return [
    e.bands.length ? `${e.bands.map((b) => b.replace("-", "–")).join(", ")} år` : "",
    aktivitetLabel(e.nff_activity) ?? "",
    ...temaer,
  ]
    .filter(Boolean)
    .join(" · ");
}
