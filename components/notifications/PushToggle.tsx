"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { subscribePushAction, testPushAction, unsubscribePushAction } from "@/app/actions/push";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

type State = "loading" | "unsupported" | "homescreen" | "denied" | "off" | "on";

const DISMISS_KEY = "nm-push-offer-dismissed";

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone and iPad only get push in the app on the home screen. */
function needsHomeScreen() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Push reminders after training on this device. «offer»: a short question
 * that only shows while push is off (and not dismissed); «full»: the status
 * with on/off and a test message.
 */
export function PushToggle({ publicKey, mode }: { publicKey: string; mode: "offer" | "full" }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [state, setState] = useState<State>("loading");
  const [dismissed, setDismissed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const check = async (): Promise<State> => {
      if (needsHomeScreen() && !supported()) return "homescreen";
      if (!supported()) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      const sub = await currentSubscription();
      if (sub && mode === "full") {
        // Keeps the groups the reminders are for up to date.
        const k = sub.toJSON().keys ?? {};
        await subscribePushAction({ endpoint: sub.endpoint, p256dh: k.p256dh ?? "", auth: k.auth ?? "" });
      }
      return sub ? "on" : "off";
    };
    check()
      .catch(() => "unsupported" as const)
      .then((s) => {
        if (!live) return;
        setState(s);
        setDismissed(readDismissed());
      });
    return () => {
      live = false;
    };
  }, [mode]);

  const turnOn = () =>
    start(async () => {
      setError(null);
      try {
        if ((await Notification.requestPermission()) !== "granted") {
          setState("denied");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const k = sub.toJSON().keys ?? {};
        const r = await subscribePushAction({ endpoint: sub.endpoint, p256dh: k.p256dh ?? "", auth: k.auth ?? "" });
        if (!r.ok) {
          await sub.unsubscribe();
          return setError(r.error);
        }
        setState("on");
        if (r.message) toast(r.message);
      } catch (err) {
        console.error("Varsler:", (err as Error).message);
        setError("Fikk ikke slått på varsler i denne nettleseren.");
      }
    });

  const turnOff = () =>
    start(async () => {
      setError(null);
      const sub = await currentSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast("Varsler er slått av på denne enheten.");
    });

  const test = () =>
    start(async () => {
      setError(null);
      const r = await testPushAction();
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
    });

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not stored: it shows again next time.
    }
    setDismissed(true);
  };

  const alert = error ? (
    <div className="nm-alert" role="alert">
      {error}
    </div>
  ) : null;

  if (mode === "offer") {
    if (state !== "off" || dismissed) return null;
    return (
      <div className="nm-note" style={{ marginTop: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <span style={{ flex: "1 1 220px" }}>Vil du få en påminnelse på mobilen når det er tid for å evaluere?</span>
        <span className="nm-row" style={{ gap: "var(--space-2)" }}>
          <button type="button" className="nm-btn nm-btn--secondary" onClick={turnOn} disabled={pending}>
            <Icon icon={Bell} />
            Slå på varsler
          </button>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={dismiss}>
            Ikke nå
          </button>
        </span>
        {alert}
      </div>
    );
  }

  if (state === "loading" || state === "unsupported") return null;
  return (
    <section className="nm-card nm-proposal" aria-labelledby="push-h" aria-busy={pending} style={{ maxWidth: 720, marginTop: "var(--space-4)" }}>
      <h3 id="push-h" className="nm-h3" style={{ margin: 0 }}>
        Påminnelse etter trening
      </h3>
      <p className="nm-hint" style={{ margin: 0 }} role="status">
        {state === "on"
          ? "På for denne enheten: du får et varsel litt etter hver trening med opplegg, hvis du ikke har evaluert den."
          : state === "denied"
            ? "Varsler er blokkert for appen. Slå dem på i innstillingene til nettleseren eller telefonen."
            : state === "homescreen"
              ? "På iPhone får du varsler når appen ligger på hjemskjermen: trykk Del og «Legg til på Hjem-skjerm», og åpne appen derfra."
              : "Av for denne enheten. Slå på for å få et varsel litt etter hver trening med opplegg."}
      </p>
      {alert}
      {state === "on" ? (
        <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" className="nm-btn nm-btn--secondary" onClick={test} disabled={pending}>
            <Icon icon={Send} />
            Send testvarsel
          </button>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={turnOff} disabled={pending}>
            <Icon icon={BellOff} />
            Slå av
          </button>
        </div>
      ) : state === "off" ? (
        <div>
          <button type="button" className="nm-btn nm-btn--secondary" onClick={turnOn} disabled={pending}>
            <Icon icon={Bell} />
            Slå på varsler
          </button>
        </div>
      ) : null}
    </section>
  );
}
