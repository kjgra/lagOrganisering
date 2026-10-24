import { describe, expect, it } from "vitest";
import { validateBankFeedback, validateFeedback } from "@/lib/plans/feedback";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";

const plan = validatePlan(reference);

describe("evaluation", () => {
  it("after a training: leaves out empty rows and needs a rating per exercise", () => {
    const rows = validateFeedback(
      [
        { exercise_no: 1, rating: 3, tags: ["goy"], actual_minutes: "12", body: "", use_again: "yes" },
        { exercise_no: 2, rating: null, tags: [], body: "" },
        { exercise_no: null, rating: 2, actual_players: "11", body: "" },
      ],
      plan,
      [],
    );
    expect(rows.map((r) => [r.exercise_no, r.exercise_code, r.rating, r.actual_minutes, r.actual_players])).toEqual([
      [1, plan.ovelser[0].kode, 3, 12, null],
      [null, "", 2, null, 11],
    ]);
    expect(() => validateFeedback([{ exercise_no: 1, rating: null, tags: ["goy"] }], plan, [])).toThrow(/velg Bra, OK eller Dårlig/);
  });

  it("from the bank: the same checks for one exercise, empty means remove", () => {
    expect(validateBankFeedback({ exercise_no: null, rating: 1, tags: ["ko", "ko"], actual_minutes: "20", actual_players: "9", use_again: "no" }, "rondo", [])).toEqual({
      exercise_no: null,
      exercise_code: "rondo",
      rating: 1,
      tags: ["ko"],
      actual_minutes: 20,
      actual_players: null,
      body: "",
      use_again: "no",
    });
    expect(validateBankFeedback({ exercise_no: null, rating: null, tags: [], body: " " }, "rondo", [])).toBeNull();
    expect(() => validateBankFeedback({ exercise_no: null, rating: null, use_again: "yes" }, "rondo", [])).toThrow(/Øvelsen: velg Bra/);
    expect(() => validateBankFeedback({ exercise_no: null, rating: 2, tags: ["ukjent"] }, "rondo", [])).toThrow(/ukjent stikkord/);
    expect(() => validateBankFeedback({ exercise_no: null, rating: 2, body: "Ola var flink" }, "rondo", ["Ola"])).toThrow(/«Ola»/);
  });
});
