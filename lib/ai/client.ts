import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiMode, env } from "@/lib/env";
import { validatePlan } from "@/lib/plans/plan";
import referencePlan from "@/lib/plans/reference-plan.json";
import { answerFromPlan, type Usage } from "./plan-ai";

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
  kind: "draft" | "revision" | "learning" | "exercise" | "feedback";
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
    console.error("KI-kall feilet:", (err as Error).message);
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
    console.error("Telling av tokens feilet:", (err as Error).message);
    return null;
  }
}

// Simulated answers ---------------------------------------------------------------------

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
      okt: { vurdering, antall_spillere: players, kommentar: "" },
    });
    usage.output_tokens = 300;
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
      text = JSON.stringify({ ...base, gjennomforing: [...base.gjennomforing, `Justert med simulert KI${wish ? `: ${wish}` : ""}.`.slice(0, 400)] });
      usage.output_tokens = 1500;
    } else if (c.kind === "exercise") {
      const e = ref.ovelser[1];
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
      text = JSON.stringify({
        ...ref,
        tittel: theme || ref.tittel,
        merknad: `${ref.merknad} (Laget av simulert KI – eksempeløkt.)`.slice(0, 500),
        ovelser: ref.ovelser.map((e) => ({ ...e, kilde: "ny", hvorfor_ny: "Eksempeløvelse fra simulert KI." })),
      });
    }
  }
  return { ok: true, text, usage, errorCode: "", message: "", durationMs: Date.now() - t0 };
}
