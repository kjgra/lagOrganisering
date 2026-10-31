"use client";

import { Mic, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { feedbackFillAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { FEEDBACK_TEXT_MAX, type FeedbackFill } from "@/lib/plans/feedback";

/** The browser's speech recognition (Chrome, Edge, Safari); not in TypeScript's DOM types. */
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function recognitionClass(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined) ?? null;
}

/**
 * «Fortell om økta»: the trainer talks or writes freely, and KI fills in the
 * evaluation form below. Nothing is saved until the form is saved.
 */
export function FeedbackDictation(p: { target: { planId: number } | { groupId: string; exerciseId: number }; session: boolean; onFill: (rows: FeedbackFill[]) => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  // Only known in the browser: false on the server and in the first render.
  const canListen = useSyncExternalStore(
    () => () => {},
    () => !!recognitionClass(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const listen = () => {
    if (listening) return rec.current?.stop();
    const R = recognitionClass();
    if (!R) return;
    const r = new R();
    r.lang = "nb-NO";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${res[0].transcript.trim()}`.slice(0, FEEDBACK_TEXT_MAX));
        else interim += res[0].transcript;
      }
      setHeard(interim);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Appen fikk ikke bruke mikrofonen. Sjekk tillatelsen i nettleseren, eller skriv i stedet." : "Talegjenkjenningen stoppet. Prøv igjen, eller skriv i stedet.");
    r.onend = () => {
      setListening(false);
      setHeard("");
    };
    rec.current = r;
    setError(null);
    r.start();
    setListening(true);
  };

  const fill = () =>
    start(async () => {
      rec.current?.stop();
      setError(null);
      const r = await feedbackFillAction({ target: p.target, text });
      if (!r.ok) return setError(r.error);
      p.onFill(r.data);
      if (r.message) toast(r.message);
    });

  return (
    <section className="nm-card nm-proposal" aria-labelledby="fb-tell" aria-busy={pending} style={{ margin: 0 }}>
      <h3 id="fb-tell" className="nm-h3" style={{ margin: 0 }}>
        {p.session ? "Fortell om økta" : "Fortell om øvelsen"}
      </h3>
      <p className="nm-hint" style={{ margin: 0 }}>
        {canListen ? "Snakk eller skriv" : "Skriv, eller bruk mikrofonen på tastaturet,"} med egne ord om hvordan det gikk, så fyller KI ut skjemaet under. Du ser over før noe lagres. Navn på spillere tas bort før teksten sendes til KI.
      </p>
      <label className="nm-field">
        <span className="nm-sr">{p.session ? "Fortell om økta" : "Fortell om øvelsen"}</span>
        <textarea
          className="nm-input"
          style={{ minHeight: 96 }}
          maxLength={FEEDBACK_TEXT_MAX}
          value={text}
          placeholder={p.session ? "F.eks. Første øvelse var gøy, men det ble kø. Avslutningen tok fem minutter for lenge. 11 spillere kom." : "F.eks. Fungerer bra med åtte, men banen blir for liten med flere."}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="nm-hint" aria-live="polite" style={{ margin: 0 }} hidden={!listening}>
        {listening ? `Lytter … ${heard}` : ""}
      </p>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        {canListen ? (
          <button type="button" className="nm-btn nm-btn--secondary" aria-pressed={listening} onClick={listen} disabled={pending}>
            <Icon icon={listening ? Square : Mic} />
            {listening ? "Stopp" : "Snakk"}
          </button>
        ) : null}
        <button type="button" className="nm-btn nm-btn--secondary" onClick={fill} disabled={pending || !text.trim()}>
          <Icon icon={Sparkles} />
          {pending ? "Fyller ut …" : "Fyll ut med KI"}
        </button>
      </div>
    </section>
  );
}
