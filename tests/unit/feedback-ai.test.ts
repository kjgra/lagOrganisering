import { describe, expect, it } from "vitest";
import { FEEDBACK_FILL_SCHEMA, feedbackFillText, feedbackFromAnswer } from "@/lib/ai/feedback-ai";
import { redactNames } from "@/lib/sensitive";

const exercises = [
  { no: 1, name: "Rondo 4 mot 1", planned: 15 },
  { no: 2, name: "Avslutning på småmål", planned: 15 },
];
const names = ["Emil Haugen", "Emil", "Sofie"];
const answer = (x: unknown) => JSON.stringify(x);
const okt = { vurdering: 0, antall_spillere: 0, kommentar: "" };

describe("«Fortell om økta»", () => {
  it("takes names out of the spoken text, full names first", () => {
    expect(redactNames("Emil Haugen og emil var gode, Sofies ball", names)).toBe("en spiller og en spiller var gode, Sofies ball");
  });

  it("orders with the exercises and the trainer's words", () => {
    const t = feedbackFillText(exercises, "  Det ble kø.  ", true);
    expect(t).toContain("- Øvelse 1: Rondo 4 mot 1 (plan 15 min)");
    expect(t).toContain("# Treneren forteller\n\nDet ble kø.");
    expect(t).not.toContain("La `okt` stå tom");
    expect(feedbackFillText(exercises.slice(0, 1), "Bra", false)).toContain("La `okt` stå tom");
  });

  it("fills only what KI found, and drops unknown exercises, keywords and values", () => {
    const rows = feedbackFromAnswer(
      answer({
        ovelser: [
          { nr: 1, vurdering: 3, stikkord: ["goy", "ko", "ukjent"], faktisk_minutter: 20, bruke_igjen: "yes", kommentar: "  Del i to ruter  " },
          { nr: 1, vurdering: 1, stikkord: [], faktisk_minutter: 0, bruke_igjen: "", kommentar: "" },
          { nr: 7, vurdering: 2, stikkord: [], faktisk_minutter: 0, bruke_igjen: "", kommentar: "" },
          { nr: 2, vurdering: 0, stikkord: [], faktisk_minutter: 0, bruke_igjen: "kanskje", kommentar: "" },
        ],
        okt: { vurdering: 2, antall_spillere: 11, kommentar: "" },
      }),
      exercises,
      true,
      names,
    );
    expect(rows).toEqual([
      { exercise_no: 1, rating: 3, tags: ["goy", "ko"], actual_minutes: "20", use_again: "yes", body: "Del i to ruter" },
      { exercise_no: null, rating: 2, actual_players: "11" },
    ]);
  });

  it("never fills in a comment with names or health words, and leaves out the session from the bank", () => {
    const rows = feedbackFromAnswer(
      answer({
        ovelser: [
          { nr: 1, vurdering: 2, stikkord: [], faktisk_minutter: 0, bruke_igjen: "", kommentar: "Sofie var god" },
          { nr: 2, vurdering: 2, stikkord: [], faktisk_minutter: 0, bruke_igjen: "", kommentar: "En ble skadet" },
        ],
        okt: { vurdering: 3, antall_spillere: 9, kommentar: "" },
      }),
      exercises,
      false,
      names,
    );
    expect(rows).toEqual([
      { exercise_no: 1, rating: 2 },
      { exercise_no: 2, rating: 2 },
    ]);
  });

  it("says so when there is nothing to fill in, or the answer is not JSON", () => {
    expect(() => feedbackFromAnswer(answer({ ovelser: [], okt }), exercises, true, names)).toThrow(/fant ingenting/);
    expect(() => feedbackFromAnswer("ikke json", exercises, true, names)).toThrow(/JSON/);
  });

  it("has a schema where every property is required", () => {
    const check = (s: Record<string, unknown>): void => {
      if (s.type === "object") {
        const props = s.properties as Record<string, Record<string, unknown>>;
        expect(s.required).toEqual(Object.keys(props));
        expect(s.additionalProperties).toBe(false);
        Object.values(props).forEach(check);
      }
      if (s.type === "array") check(s.items as Record<string, unknown>);
    };
    check(FEEDBACK_FILL_SCHEMA);
  });
});
