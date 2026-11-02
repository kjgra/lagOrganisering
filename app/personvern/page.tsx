import type { Metadata } from "next";
import { X } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/env";
import { DEPARTED_DAYS } from "@/lib/store/departed";
import { MAINTENANCE_RULES } from "@/lib/maintenance";
import { safeBack } from "@/lib/settings-nav";

export const metadata: Metadata = { title: "Personvern" };

/**
 * The privacy notice (GDPR art. 13/14), open without login so it can be
 * linked from Spond. Controller and contact come from PRIVACY_CONTROLLER and
 * PRIVACY_CONTACT; keep the text in line with what the code really does.
 */
export default async function PrivacyPage(props: PageProps<"/personvern">) {
  // From Innstillinger the page gets ?fra=, so «back» and the close button return there.
  const back = safeBack((await props.searchParams).fra);
  const fromSettings = back.startsWith("/innstillinger");
  const e = env();
  const controller = e.PRIVACY_CONTROLLER.trim() || "Trenerteamet som bruker appen i Nymark";
  const contact = e.PRIVACY_CONTACT.trim() || "treneren på laget, i Spond";
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand />
        <Link href={back} className="nm-iconbtn" aria-label={fromSettings ? "Lukk og gå tilbake til innstillinger" : "Lukk"} style={{ color: "var(--on-chrome)" }}>
          <Icon icon={X} />
        </Link>
      </div>
      <div className="nm-login__body">
        <article className="nm-login__card">
          <h1 className="nm-h2" style={{ margin: 0 }}>
            Personvern
          </h1>
          <p style={{ margin: 0 }}>
            Nymark – Gruppeorganisering er et verktøy for trenere: å dele spillere inn i grupper og lag, lage treningsopplegg og evaluere øvelser. Her står hva appen lagrer om
            barn og trenere, og hvorfor.
          </p>

          <section>
            <h2 className="nm-h3">Hvem er ansvarlig</h2>
            <p>{controller}. Spørsmål og ønsker om innsyn eller sletting: {contact}.</p>
          </section>

          <section>
            <h2 className="nm-h3">Hva som lagres</h2>
            <p>
              Appen lagrer <strong>ikke navn</strong>, fødselsdato, adresse eller kontaktinformasjon. Den lagrer bare Spond-ID-er, og henter navnene fra Spond når en trener
              åpner appen.
            </p>
            <ul>
              <li>
                <strong>Om spillere:</strong> hvilken gruppe og hvilket lag spilleren er satt på, og eventuelt et nivå fra 1 til 5, korte stikkord (for eksempel «Keeper») og
                hvilke spillere som fungerer godt sammen.
              </li>
              <li>
                <strong>Om trenere:</strong> tilganger i appen, kommentarer, evalueringer og treningsopplegg treneren har laget, egne innstillinger og varsler, og bruk av KI.
              </li>
            </ul>
            <p>Helseopplysninger og annet sensitivt skal ikke skrives i appen. Appen stopper de vanligste ordene.</p>
          </section>

          <section>
            <h2 className="nm-h3">Hvorfor</h2>
            <p>
              For å gi barna et godt treningstilbud: jevne grupper, passende utfordringer og gode økter. Grunnlaget er berettiget interesse (personvernforordningen artikkel
              6 nr. 1 f). Nivå og par er bare et hjelpemiddel for trenerne og vises aldri på lagtavla som brukes på banen.
            </p>
          </section>

          <section>
            <h2 className="nm-h3">Hvem ser det</h2>
            <p>Bare trenere med tilgang til gruppen i Spond, og som er gitt tilgang i appen. Nivå, stikkord og par ser bare trenere som har fått tilgang til dem.</p>
          </section>

          <section>
            <h2 className="nm-h3">Hvor dataene er</h2>
            <ul>
              <li>Databasen ligger hos Supabase i Irland, og appen kjører hos Vercel i Dublin. Begge har databehandleravtale.</li>
              <li>Treningsopplegg kan lages med KI fra Anthropic (USA). KI får aldri navn på spillere eller trenere.</li>
              <li>Varsler på mobilen går gjennom nettleserens varseltjeneste og inneholder ingen navn.</li>
            </ul>
          </section>

          <section>
            <h2 className="nm-h3">Hvor lenge</h2>
            <ul>
              <li>Nivå, stikkord og par slettes {DEPARTED_DAYS} dager etter at spilleren har sluttet i gruppen i Spond.</li>
              <li>Treningsopplegg eldre enn ett år arkiveres og slettes. Bruk av KI per trener slås sammen etter {MAINTENANCE_RULES.aiMonths} måneder.</li>
            </ul>
          </section>

          <section>
            <h2 className="nm-h3">Dine rettigheter</h2>
            <p>
              Du kan be om innsyn i hva som er lagret om deg eller barnet ditt, få det rettet eller slettet, og protestere mot behandlingen. Kontakt {contact}. Du kan også klage
              til <a href="https://www.datatilsynet.no">Datatilsynet</a>.
            </p>
          </section>

          <Link className="nm-btn nm-btn--secondary nm-btn--block" href={back}>
            {fromSettings ? "Tilbake til innstillinger" : "Til appen"}
          </Link>
        </article>
      </div>
    </div>
  );
}
