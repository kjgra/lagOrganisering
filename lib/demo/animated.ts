/**
 * Two exercises for the demo and preview bank that show the animation: one
 * where the app guesses the order, and one with steps, captions and a choice.
 */
export const ANIMATED_EXERCISES = [
  {
    code: "veggspill-og-avslutning",
    name: "Veggspill og avslutning",
    category: "avslutning",
    themes: ["Komme til avslutning"],
    organisation: "Ett mål med keeper. To køer 25 m ut fra mål, en sentralt og en på skrå\nEn veggspiller står ved kjegle 18 m fra mål\nBaller i den sentrale køen",
    execution:
      "Spilleren fra den sentrale køen spiller til veggspilleren og løper forbi\nVeggspilleren spiller ballen tilbake i løpet (én touch)\nSpilleren avslutter på mål innen to touch\nSpilleren fra den skrå køen løper samtidig mot bakre stolpe og tar returer",
    learning_points: "Tempo i pasningen inn til veggen\nLøp forbi med en gang du har spilt\nSe på keeperen, så på ballen\nPlassering foran kraft",
    questions: "Hvor må veggspilleren spille ballen for at du kan skyte på første touch?",
    easier: "Veggspilleren stopper ballen og spiller den i rom.",
    harder: "En passiv forsvarer følger løpet. Avslutning på første touch.",
    drawing: {
      skisser: [
        {
          tittel: "Veggspill og avslutning",
          bane: { bredde: 30, lengde: 26, marg: 4 },
          objekter: [
            { type: "maal", x: 15, y: 26, bredde: 5, side: "topp" },
            { type: "spiller", x: 15, y: 25, lag: "joker", tekst: "K" },
            { type: "spiller", x: 15, y: 2, lag: "1", tekst: "A" },
            { type: "ball", x: 15, y: 2.9 },
            { type: "spiller", x: 15, y: -0.5, lag: "1" },
            { type: "spiller", x: 24, y: 4, lag: "1", tekst: "R" },
            { type: "spiller", x: 11, y: 9, lag: "1", tekst: "V" },
          ],
          piler: [
            { type: "pasning", fra: [15, 2.9], til: [11.6, 8.3] },
            { type: "lop", fra: [15, 2], til: [16.5, 12], bue: 0.15 },
            { type: "pasning", fra: [11.6, 9.7], til: [16.3, 13.4] },
            { type: "pasning", fra: [16.5, 13.6], til: [17, 25.8] },
            { type: "lop", fra: [24, 4], til: [12.5, 22.5], bue: -0.15 },
          ],
          tekster: [{ x: 15, y: -2, tekst: "Spill, løp forbi, avslutt på to touch" }],
        },
      ],
    },
  },
  {
    code: "2-mot-1-mot-mal",
    name: "2 mot 1 mot mål",
    category: "angrep",
    themes: ["Komme til avslutning"],
    organisation: "Bane 20 × 30 m med mål og keeper\nTo angripere starter på midtlinjen med ball, én forsvarer starter ved 16-meteren",
    execution: "Angriperne spiller 2 mot 1 mot mål\nForsvareren prøver å vinne ballen og føre den over midtlinjen\nAngriperne må avslutte innen 10 sekunder",
    learning_points: "Ballfører angriper forsvareren for å binde ham\nMedspilleren holder bredde\nSpill når forsvareren har valgt, dribl når han venter",
    questions: "Når er det riktig tidspunkt å spille pasningen?\nHva gjør du hvis forsvareren dekker medspilleren?",
    easier: "Forsvareren starter lenger unna. Ingen tidsgrense.",
    harder: "En ekstra forsvarer kommer inn bakfra etter tre sekunder.",
    drawing: {
      skisser: [
        {
          tittel: "2 mot 1",
          bane: { bredde: 20, lengde: 30, marg: 4 },
          linjer: [{ fra: [0, 0.3], til: [20, 0.3] }],
          objekter: [
            { type: "maal", x: 10, y: 30, bredde: 5, side: "topp" },
            { type: "spiller", x: 10, y: 29, lag: "joker", tekst: "K" },
            { type: "spiller", x: 7, y: 6, lag: "1", tekst: "1" },
            { type: "ball", x: 7.6, y: 6.6 },
            { type: "spiller", x: 14, y: 5, lag: "1", tekst: "2" },
            { type: "spiller", x: 10, y: 17, lag: "2", tekst: "F" },
          ],
          piler: [
            { type: "foring", fra: [7.6, 6.6], til: [8.8, 13], bue: 0.1, trinn: 1 },
            { type: "lop", fra: [14, 5], til: [15, 18], bue: 0.15, trinn: 1 },
            { type: "lop", fra: [10, 17], til: [9.6, 15], trinn: 1, skjult: true },
            { type: "pasning", fra: [8.8, 13], til: [14.6, 18.2], trinn: 2, alternativ: 1 },
            { type: "lop", fra: [9.6, 15], til: [10.6, 15.8], trinn: 2, alternativ: 1, skjult: true },
            { type: "pasning", fra: [15, 19], til: [11.5, 29.8], trinn: 3, alternativ: 1 },
            { type: "foring", fra: [8.8, 13], til: [5.6, 21], bue: 0.12, trinn: 2, alternativ: 2 },
            { type: "lop", fra: [9.6, 15], til: [13, 17.5], trinn: 2, alternativ: 2, skjult: true },
            { type: "pasning", fra: [5.6, 21], til: [8.6, 29.8], trinn: 3, alternativ: 2 },
          ],
          tekster: [{ x: 10, y: -1.6, tekst: "Bind forsvareren, spill eller dribl" }],
          trinnliste: [
            { tekst: "1 fører ballen rett mot forsvareren. 2 løper i bredden" },
            {
              tekst: "",
              valg: { sporsmal: "Hva gjør forsvareren?", alternativer: ["Går mot ballen", "Dekker løpet"] },
              tekster: ["Forsvareren går mot ballen. Da spiller 1 til 2 i rommet", "Forsvareren dekker løpet. Da fører 1 ballen forbi på venstre side"],
            },
            { tekst: "", tekster: ["2 avslutter før forsvareren rekker tilbake", "1 avslutter selv"] },
          ],
        },
      ],
    },
  },
];
