import { EXERCISE_LICENSE } from "@/lib/license";

/**
 * Says that the exercise bank is open data under CC BY-SA 4.0. `contribute` is
 * for forms that save to the bank: saving shares the exercise under the same licence.
 */
export function ExerciseLicense({ contribute = false }: { contribute?: boolean }) {
  const licence = (
    <a className="nm-link" href={EXERCISE_LICENSE.url} target="_blank" rel="noopener noreferrer license">
      {EXERCISE_LICENSE.name}
    </a>
  );
  return (
    <p className="nm-hint" style={{ marginTop: "var(--space-4)" }}>
      {contribute ? (
        <>Øvelsen blir åpne data under {licence} når den lagres i banken. Legg bare inn det du har lov til å dele.</>
      ) : (
        <>
          Øvelsene er åpne data under {licence}: alle kan bruke og endre dem, også kommersielt, men endrede utgaver må deles videre under samme lisens.{" "}
          <a className="nm-link" href={EXERCISE_LICENSE.repoUrl} target="_blank" rel="noopener noreferrer">
            Mer om lisensen
          </a>
        </>
      )}
    </p>
  );
}
