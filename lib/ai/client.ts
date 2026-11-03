import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiMode, env } from "@/lib/env";
import { validatePlan } from "@/lib/plans/plan";
import referencePlan from "@/lib/plans/reference-plan.json";
import { answerFromPlan, type Usage } from "./plan-ai";
import { reportError } from "@/lib/errors";

/**
 * One call to the Claude API (Messages). The API key comes from
 * ANTHROPIC_API_KEY and is never logged. With AI_MOCK=true (and no key) a
 * simulated answer is returned, so the whole flow can be tried without a key.
 *
 * Sonnet 5.5 requests opt into the server-side refusal fallback: if a safety
 * classifier declines, the API re-runs the request on a suitable model
 * within the same call (Claude API only).
 */

export interface CallInput {
  model: string;
  /** Cached system blocks: the fixed instructions first, then the bank catalogue. */
  system: string[];
  user: string;
  /** A JSON schema for structured output, or none for plain text. */
  schema?: Record<string, unknown>;
  maxTokens: number;
  kind: "draft" | "revision" | "learning" | "exercise" | "feedback" | "observations" | "needs";
}

export interface CallResult {
  ok: boolean;
  text: string;
  usage: Usage;
  errorCode: string;
  message: string;
  durationMs: number;
}

const NO_USAGE: Usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic({ apiKey: env().ANTHROPIC_API_KEY, maxRetries: 1, timeout: 300_000 }));

function body(c: CallInput) {
  return {
    model: c.model,
    max_tokens: c.maxTokens,
    system: c.system.map((text) => ({ type: "text" as const, text, cache_control: { type: "ephemeral" as const } })),
    messages: [{ role: "user" as const, content: c.user }],
    ...(c.schema ? { output_config: { format: { type: "json_schema" as const, schema: c.schema } } } : {}),
  };
}

export async function callClaude(c: CallInput): Promise<CallResult> {
  const t0 = Date.now();
  const done = (r: Omit<CallResult, "durationMs">): CallResult => ({ ...r, durationMs: Date.now() - t0 });
  if (aiMode() === "mock") return mockCall(c, t0);
  if (aiMode() === "off") return done({ ok: false, text: "", usage: NO_USAGE, errorCode: "ikke_satt_opp", message: "KI er ikke satt opp (ANTHROPIC_API_KEY mangler)." });
  try {
    const sonnet = c.model === "claude-sonnet-5-5";
    // Streaming: answers can be long (up to 32k tokens) and take a minute.
    const msg = await api()
      .beta.messages.stream({
        ...body(c),
        ...(sonnet ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      })
      .finalMessage();
    const u = msg.usage;
    const usage: Usage = {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
    };
    if (msg.stop_reason === "refusal") {
      return done({ ok: false, text: "", usage, errorCode: "refusal", message: "KI-en avslo forespørselen. Prøv å skrive ønskene annerledes." });
    }
    if (msg.stop_reason === "max_tokens") {
      return done({ ok: false, text: "", usage, errorCode: "max_tokens", message: "Svaret ble for langt og ble kuttet. Prøv med færre øvelser." });
    }
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    if (!text.trim()) return done({ ok: false, text: "", usage, errorCode: "tomt_svar", message: "KI-en svarte ikke med et opplegg. Prøv igjen." });
    return done({ ok: true, text, usage, errorCode: "", message: "" });
  } catch (err) {
    const fail = (code: string, message: string) => done({ ok: false, text: "", usage: NO_USAGE, errorCode: code, message });
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return fail("authentication_error", "API-nøkkelen ble avvist. Sjekk ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) return fail("rate_limit_error", "For mange forespørsler akkurat nå. Prøv igjen om litt.");
    if (err instanceof Anthropic.APIConnectionError) return fail("nettverk", "Fikk ikke kontakt med KI-tjenesten. Prøv igjen om litt.");
    if (err instanceof Anthropic.APIError) {
      if (/credit|usage limit|spend limit|billing/i.test(err.message)) {
        return fail("grense", "Grensen hos Anthropic er nådd, eller kreditten er brukt opp. Lag opplegget manuelt.");
      }
      if (err.status === 529) return fail("overloaded_error", "KI-tjenesten er overbelastet. Prøv igjen om litt.");
      return fail(`http_${err.status ?? "ukjent"}`, `KI-tjenesten svarte med en feil (HTTP ${err.status ?? "?"}). Prøv igjen om litt.`);
    }
    await reportError("KI-kall", err);
    return fail("ukjent", "Noe gikk galt med KI. Prøv igjen om litt.");
  }
}

/** Input tokens for a price estimate (free to count), or null if counting failed. */
export async function countTokens(c: CallInput): Promise<number | null> {
  if (aiMode() === "mock") return Math.round((c.system.join("").length + c.user.length) / 3.5);
  if (aiMode() === "off") return null;
  try {
    const b = body(c);
    const r = await api().messages.countTokens({ model: b.model, system: b.system, messages: b.messages, ...(c.schema ? { output_config: b.output_config } : {}) });
    return r.input_tokens;
  } catch (err) {
    await reportError("Telling av tokens", err);
    return null;
  }
}

// Simulated answers ---------------------------------------------------------------------

/** Simulated «Ny øvelse med KI» when the trainer writes a wish: different enough not to be blocked as too similar. */
const MOCK_EXERCISES = [
  { navn: "Simulert: Fargekjegler", organisering: ["Spre gule, røde og blå markører utover feltet."], gjennomforing: ["Treneren roper farge, alle dribler raskt dit og tilbake."] },
  { navn: "Simulert: Portløp", organisering: ["Lag mange små porter av to hatter hver."], gjennomforing: ["Hvert par teller hvor mange porter de spiller pasning gjennom på ett minutt."] },
  { navn: "Simulert: Haien", organisering: ["Én hai står midt i rektangelet uten egen lærball."], gjennomforing: ["De andre krysser fra side til side, haien sparker bort det den når."] },
  { navn: "Simulert: Vegg og løp", organisering: ["Trioer står i trekant med fem meters avstand."], gjennomforing: ["Veggspill, deretter sprint rundt nærmeste hatt og bytt rolle."] },
  { navn: "Simulert: Kongen på haugen", organisering: ["Fire firkanter, én konge i hver."], gjennomforing: ["Utfordreren vinner ruta ved å score på kongens minimål."] },
  { navn: "Simulert: Stafett med vending", organisering: ["Rekker bak en startlinje, slalåmstokker foran hver rekke."], gjennomforing: ["Føring gjennom stokkene, vending med sålen, tilbake og veksle."] },
  { navn: "Simulert: Overtall to mot én", organisering: ["Angripere i par møter én forsvarer foran stort mål."], gjennomforing: ["Paret avslutter innen åtte sekunder, forsvareren kontrer mot linjen."] },
  { navn: "Simulert: Tigerfangst", organisering: ["Halvparten har vest i buksa som hale."], gjennomforing: ["Uten lærball jakter resten på haler, hver fangst gir poeng."] },
];

async function mockCall(c: CallInput, t0: number): Promise<CallResult> {
  await new Promise((r) => setTimeout(r, process.env.NODE_ENV === "test" ? 0 : 1200));
  const inTokens = Math.round((c.system.join("").length + c.user.length) / 3.5);
  const usage: Usage = { input_tokens: Math.round(inTokens * 0.2), output_tokens: 5200, cache_read_tokens: Math.round(inTokens * 0.8), cache_write_tokens: 0 };
  let text: string;
  if (c.kind === "feedback") {
    // Simple keyword rules, so the flow can be tried: every exercise gets the same.
    const said = /# Treneren forteller\n\n([\s\S]*?)\n\nFyll ut/.exec(c.user)?.[1] ?? "";
    const nos = [...c.user.matchAll(/^- Øvelse (\d+):/gm)].map((m) => Number(m[1]));
    const vurdering = /dårlig/i.test(said) ? 1 : /bra|gøy|fint/i.test(said) ? 3 : 2;
    const stikkord = [/kø|vent/i.test(said) ? "ko" : "", /gøy|moro/i.test(said) ? "goy" : "", /trang|liten/i.test(said) ? "bane_liten" : ""].filter(Boolean);
    const kommentar = `Simulert KI: ${said.replace(/\s+/g, " ").slice(0, 120)}`;
    const players = Number(/(\d+) (?:spillere|stykker|barn)/i.exec(said)?.[1] ?? 0);
    text = JSON.stringify({
      ovelser: nos.map((nr) => ({ nr, vurdering, stikkord, faktisk_minutter: 0, bruke_igjen: vurdering === 1 ? "changes" : "yes", kommentar })),
      okt: {
        vurdering,
        stikkord: [/flyt/i.test(said) ? "god_flyt" : "", /trener/i.test(said) && /få|for lite/i.test(said) ? "for_faa_trenere" : "", /aktiv/i.test(said) ? "mye_aktivitet" : ""].filter(Boolean),
        antall_spillere: players,
        kommentar: "",
      },
    });
    usage.output_tokens = 300;
  } else if (c.kind === "observations") {
    // Simple keyword rules: kø, trang/liten bane, gøy, and «del i …» as the trainer's suggestion.
    const innspill = [...c.user.matchAll(/^- id (\d+) .*\n {2}Kommentar: (.*)$/gm)].map(([, id, said]) => ({
      id: Number(id),
      observasjoner: [
        /kø|vent/i.test(said) ? { type: "ko", del: "organisering", styrke: "tydelig", forslag: /(del [^.,]*)/i.exec(said)?.[1] ?? "" } : null,
        /trang|liten bane/i.test(said) ? { type: "bane_liten", del: "organisering", styrke: "tydelig", forslag: "" } : null,
        /gøy|moro/i.test(said) ? { type: "goy", del: "", styrke: "svak", forslag: "" } : null,
      ].filter(Boolean),
    }));
    text = JSON.stringify({ innspill });
    usage.output_tokens = 40 * innspill.length;
  } else if (c.kind === "needs") {
    // Simple keyword rules, so the flow can be tried.
    const rules: [RegExp, string][] = [
      [/kø|vent/i, "mindre_ko"],
      [/for mange spillere|færre per/i, "faerre_per_gruppe"],
      [/kjegle|utstyr/i, "lite_utstyr"],
      [/1 ?mot ?1/i, "mer_1mot1"],
      [/aktivitet|alle i aktivitet/i, "mer_aktivitet"],
      [/enklere/i, "enklere"],
    ];
    const tekster = [...c.user.matchAll(/^- id (\S+)\n {2}Tekst: (.*)$/gm)].map(([, id, said]) => ({ id, behov: rules.filter(([re]) => re.test(said)).map(([, k]) => k) }));
    text = JSON.stringify({ tekster });
    usage.output_tokens = 20 * tekster.length;
  } else if (c.kind === "learning") {
    text =
      "- Guttene liker konkurranse med poeng; bruk det i avslutningen.\n" +
      "- Øvelser med kø fungerer dårlig; del heller i flere små ruter.\n" +
      "- Øvelsene tar ofte litt lenger tid enn planlagt; sett av tid til bytte.\n" +
      "- (Simulert KI: dette er eksempeltekst, ikke en ekte oppsummering.)";
    usage.output_tokens = 180;
  } else {
    const ref = answerFromPlan(validatePlan(referencePlan));
    const theme = /Månedens tema: (.+)/.exec(c.user)?.[1]?.trim();
    const wish = /# (?:Endringsønske|Ønsker fra treneren)\n\n?([\s\S]*?)(\n\n#|\n\nJuster|$)/.exec(c.user)?.[1]?.trim() || /- Ønsker fra treneren: (.+)/.exec(c.user)?.[1];
    const current = /# Gjeldende opplegg\n\n(.+)\n/.exec(c.user)?.[1];
    const currentExercise = /# Gjeldende øvelse\n\n(.+)\n/.exec(c.user)?.[1];
    if (c.kind === "exercise" && currentExercise) {
      const base = JSON.parse(currentExercise) as Record<string, unknown> & { gjennomforing: string[] };
      // Asked to fill in what is missing («Mangler info»): it does.
      const fill = /Fyll inn det øvelsen mangler/.test(c.user)
        ? { min_spillere: 6, maks_spillere: 10, minutter: 15, omrade: "20 × 15 m", aktivitet: "sjef-intro", nff_tags: ["tema.spille-framover"] }
        : {};
      text = JSON.stringify({ ...base, ...fill, gjennomforing: [...base.gjennomforing, `Justert med simulert KI${wish ? `: ${wish}` : ""}.`.slice(0, 400)] });
      usage.output_tokens = 1500;
    } else if (c.kind === "exercise") {
      // Its own content, so it is not too much like the reference exercises in the demo bank.
      // Without a wish, always the same exercise (the e2e test checks that it is not saved twice).
      // With a wish, one of several different ones, so «Ny øvelse med KI» can be tried again and again.
      // One the bank (in the catalogue) does not have yet, when there is one.
      const known = c.system.join("\n");
      const free = MOCK_EXERCISES.filter((x) => !known.includes(x.navn));
      const from = free.length ? free : MOCK_EXERCISES;
      const pick = wish ? from[[...wish].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % from.length] : null;
      const e = {
        ...ref.ovelser[1],
        navn: pick?.navn ?? "Simulert KI-øvelse",
        organisering: pick?.organisering ?? ["Simulert: sett opp en sone med kjegler.", "Del gruppa i to like store lag."],
        gjennomforing: [...(pick?.gjennomforing ?? ["Simulert: lagene konkurrerer om å holde sonen lengst."]), `Eksempeltekst fra simulert KI${wish ? `: ${wish}` : ""}.`.slice(0, 400)],
        laeringsmomenter: ["Simulert: snakk sammen."],
        sporsmal: ["Simulert: hva fungerte?"],
      };
      text = JSON.stringify({
        ...e,
        kilde: "ny",
        hvorfor_ny: `Eksempeløvelse fra simulert KI${wish ? `: ${wish}` : ""}.`.slice(0, 300),
        min_spillere: 6,
        maks_spillere: 10,
        minutter: 15,
        omrade: "20 × 15 m",
      });
      usage.output_tokens = 1800;
    } else if (c.kind === "revision" && current) {
      const base = JSON.parse(current) as ReturnType<typeof answerFromPlan>;
      text = JSON.stringify({
        ...base,
        merknad: `${base.merknad} Justert med simulert KI${wish ? `: ${wish}` : ""}.`.slice(0, 500),
        ovelser: base.ovelser.map((e) => ({ ...e, kilde: "uendret", tegning_json: "" })),
      });
    } else {
      // The first warm-up exercise in the catalogue, as the common warm-up.
      const warmup = /^- ([a-z0-9-]+) \| [^|\n]+ \| oppvarming \|/m.exec(`${c.system.join("\n")}\n${c.user}`)?.[1] ?? "";
      text = JSON.stringify({
        ...ref,
        oppvarming_kode: warmup,
        tittel: theme || ref.tittel,
        merknad: `${ref.merknad} (Laget av simulert KI – eksempeløkt.)`.slice(0, 500),
        ovelser: ref.ovelser.map((e) => ({ ...e, kilde: "ny", hvorfor_ny: "Eksempeløvelse fra simulert KI." })),
      });
    }
  }
  return { ok: true, text, usage, errorCode: "", message: "", durationMs: Date.now() - t0 };
}
