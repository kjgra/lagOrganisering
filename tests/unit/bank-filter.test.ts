import { describe, expect, it } from "vitest";
import { NO_FILTERS, filterBank, filtersFrom, hasFilters, ratingOf, type BankItem } from "@/lib/plans/bank-filter";

const item = (over: Partial<BankItem>): BankItem => ({
  id: 1,
  name: "Rondo",
  category: "pasning_mottak",
  status: "active",
  summary: "",
  nff: "",
  avoid: false,
  bands: [],
  activity: "",
  tags: [],
  rating: "ingen",
  drawing: null,
  facts: "",
  ...over,
});

describe("bank filters", () => {
  const bank = [
    item({ id: 1, name: "Rondo 4 mot 1", bands: ["8-9", "10-12"], activity: "med-og-mot", tags: ["tema.spille-framover", "delf.pasning"], rating: "bra" }),
    item({ id: 2, name: "Hjem bak ballen", category: "forsvar", bands: ["10-12"], activity: "spill", tags: ["tema.vinne-ball", "delf.press"], rating: "darlig" }),
    item({ id: 3, name: "Sistemann med ball", category: "oppvarming" }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>) => filterBank(bank, { ...NO_FILTERS, ...f }).map((b) => b.id);

  it("shows everything without filters", () => {
    expect(ids({})).toEqual([1, 2, 3]);
  });

  it("filters on each facet, and on all of them together", () => {
    expect(ids({ alder: "8-9" })).toEqual([1]);
    expect(ids({ alder: "10-12" })).toEqual([1, 2]);
    expect(ids({ tema: "vinne-ball" })).toEqual([2]);
    expect(ids({ aktivitet: "med-og-mot" })).toEqual([1]);
    expect(ids({ delf: "pasning" })).toEqual([1]);
    expect(ids({ kategori: "oppvarming" })).toEqual([3]);
    expect(ids({ vurdering: "ingen" })).toEqual([3]);
    expect(ids({ alder: "10-12", delf: "press" })).toEqual([2]);
    expect(ids({ alder: "8-9", kategori: "forsvar" })).toEqual([]);
  });

  it("searches names without minding case", () => {
    expect(ids({ q: "  BALL" })).toEqual([2, 3]);
  });

  it("reads filters from the URL", () => {
    const f = filtersFrom(new URLSearchParams("kategori=forsvar&ny=4&q=x"));
    expect(f).toEqual({ ...NO_FILTERS, kategori: "forsvar", q: "x" });
    expect(hasFilters(f)).toBe(true);
    expect(hasFilters(filtersFrom(new URLSearchParams("ny=4")))).toBe(false);
  });

  it("puts an exercise in a rating bucket from its average", () => {
    expect(ratingOf({ fb_n: 0, fb_mean: null })).toBe("ingen");
    expect(ratingOf({ fb_n: 2, fb_mean: 2.5 })).toBe("bra");
    expect(ratingOf({ fb_n: 2, fb_mean: 2 })).toBe("ok");
    expect(ratingOf({ fb_n: 1, fb_mean: 1 })).toBe("darlig");
  });
});
