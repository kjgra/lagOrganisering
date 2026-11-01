import Link from "next/link";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { safeBack } from "@/lib/settings-nav";
import { waitingFeedbackCount } from "@/lib/store/feedback";

/** «Tilbakemelding»: report a problem or suggest an improvement. */
export default async function FeedbackPage(props: PageProps<"/innstillinger/tilbakemelding">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const back = safeBack(sp.fra);
  const lag = typeof sp.lag === "string" ? sp.lag : "";
  const waiting = await waitingFeedbackCount(await db(), user.rights).catch(() => 0);
  return (
    <SettingsShell user={user} back={back} tab="tilbakemelding" groupId={lag || undefined}>
      <h2 className="nm-h2">Tilbakemelding</h2>
      <p style={{ margin: "0 0 var(--space-4)" }}>
        Fant du en feil, eller har du et forslag til hvordan appen kan bli bedre? Skriv det her. Admin går gjennom tilbakemeldingene og legger de som skal følges opp, ut som en
        sak på GitHub, der appen utvikles åpent. Navnet ditt blir ikke med.
      </p>
      {user.rights.superadmin && waiting ? (
        <p className="nm-hint">
          {waiting} {waiting === 1 ? "tilbakemelding venter" : "tilbakemeldinger venter"} på deg.{" "}
          <Link href={`/innstillinger/tilbakemeldinger?fra=${encodeURIComponent(back)}${lag ? `&lag=${encodeURIComponent(lag)}` : ""}`}>Gå til innboksen</Link>
        </p>
      ) : null}
      <FeedbackForm page={back} />
    </SettingsShell>
  );
}
