#!/usr/bin/env bash
# Oppretter en sak (issue) med etiketten «auto-feil», eller kommenterer på en
# åpen sak med samme tittel, så samme feil aldri gir flere saker.
# Bruk: meld-feil.sh "<tittel>" "<ekstra etikett>" <fil med tekst>
# Med KUN_NY=1 skjer ingenting når saken allerede er åpen.
set -euo pipefail
TITLE="$1"
LABEL="$2"
BODY_FILE="$3"
REPO="${GITHUB_REPOSITORY:?}"

gh label create auto-feil --repo "$REPO" --color B60205 --description "Feil funnet automatisk av feilvakten" >/dev/null 2>&1 || true
gh label create "$LABEL" --repo "$REPO" --color FBCA04 >/dev/null 2>&1 || true

existing=$(TITLE="$TITLE" gh issue list --repo "$REPO" --state open --label auto-feil --limit 100 --json number,title \
  --jq '.[] | select(.title == env.TITLE) | .number' | head -n1)

if [ -n "$existing" ] && [ "${KUN_NY:-}" = "1" ]; then
  echo "Sak #$existing er allerede åpen"
elif [ -n "$existing" ]; then
  gh issue comment "$existing" --repo "$REPO" --body-file "$BODY_FILE"
  echo "Kommenterte på #$existing"
else
  gh issue create --repo "$REPO" --title "$TITLE" --label auto-feil --label "$LABEL" --body-file "$BODY_FILE"
fi
