import { describe, expect, it } from "vitest";
import { fagplanText } from "@/lib/ai/plan-ai";
import { learningPoint } from "@/lib/nff/fagplan";
import { linkName, linkTags, normTheme, pickedLink, themeLink } from "@/lib/nff/theme-link";

const link = (theme: string, band: "6-7" | "8-9" | "10-12" = "10-12") => {
  const l = themeLink(theme, band);
  return l && { tema: l.hovedtema, delf: l.delferdigheter, lm: l.learningPoints.length };
};

describe("trainers' own themes linked to NFF", () => {
  it("links the team's twelve months for 10–12 år", () => {
    expect(link("Grunnleggende ballkontroll")).toEqual({ tema: ["tema.spille-framover"], delf: ["delf.foring", "delf.vending", "delf.mottak"], lm: 0 });
    expect(link("Pasning og mottak")).toEqual({ tema: ["tema.spille-framover"], delf: ["delf.pasning", "delf.mottak"], lm: 0 });
    expect(link("Dribling og finter")).toEqual({ tema: ["tema.spille-framover"], delf: ["delf.foring", "delf.dribling"], lm: 0 });
    expect(link("Skudd og avslutning")).toEqual({ tema: ["tema.komme-til-avslutning"], delf: ["delf.skudd"], lm: 0 });
    expect(link("Forsvarsspill")).toEqual({ tema: ["tema.vinne-ball", "tema.hindre-avslutning"], delf: ["delf.press", "delf.klarering", "delf.kampen-om-ballen"], lm: 0 });
    expect(link("Angrepsspill")).toEqual({ tema: ["tema.spille-framover", "tema.komme-til-avslutning"], delf: [], lm: 0 });
    expect(link("Ferie")).toBeNull();
    expect(link("Orientering og bevegelse uten ball")).toEqual({ tema: ["tema.spille-framover"], delf: ["delf.mottak"], lm: 0 });
    expect(link("Spilleforståelse")).toBeNull();
    expect(link("Omstilling")).toEqual({ tema: [], delf: [], lm: 6 });
    expect(link("Forsvar")?.tema).toEqual(["tema.vinne-ball", "tema.hindre-avslutning"]);
    expect(link("Oppsummering og mestring")).toBeNull();
  });

  it("uses the band's own terms, and an NFF hovedtema as it is", () => {
    expect(link("Pasning og mottak", "6-7")).toEqual({ tema: ["tema.score-mal"], delf: ["delf.pasning", "delf.mottak"], lm: 0 });
    // Heading is not in the fagplan for 6–7 år.
    expect(link("Heading", "6-7")).toBeNull();
    expect(link("Hindre avslutning")).toEqual({ tema: ["tema.hindre-avslutning"], delf: [], lm: 0 });
    expect(link("Spille oss fremover i banen")).toEqual({ tema: ["tema.spille-framover"], delf: [], lm: 0 });
    expect(themeLink("Pasning", null)).toBeNull();
    expect(normTheme("  Spille oss FREMOVER!! ")).toBe("spille oss framover");
    expect(linkTags(themeLink("Skudd", "8-9"))).toEqual(["tema.komme-til-avslutning", "delf.skudd"]);
  });

  it("gives KI the link and the learning points it stands for", () => {
    const t = fagplanText("10-12", "Pasning og mottak");
    expect(t).toContain("«Pasning og mottak» er trenernes eget ord. Hos NFF svarer det til hovedtema Spille oss framover i banen; delferdigheter Pasning, Medtak/mottak.");
    expect(t).toContain("## Læringsmomenter for delferdigheten «Medtak/mottak»");
    expect(t).toContain("- Før medtak/mottak: Halvåpen kroppsstilling for å se både ball og neste trekk.");
    expect(t).toContain("## Læringsmomenter for «Spille oss framover i banen»");
    const o = fagplanText("10-12", "Omstilling");
    expect(o).toContain("## Læringsmomenter fra NFF som passer «Omstilling»");
    expect(o).toContain("Omstill raskt til forsvar om pasningen brytes.");
    // An NFF hovedtema needs no explanation.
    expect(fagplanText("10-12", "Spille oss framover i banen")).not.toContain("Temaet koblet til NFF");
  });
});

describe("pickedLink", () => {
  it("is the trainers' picks with names, or null when nothing is picked", () => {
    expect(pickedLink({ hovedtema_id: null, delferdighet_id: null, learning_point_ids: [] })).toBeNull();
    const l = pickedLink({ hovedtema_id: "tema.egen.abc", delferdighet_id: "delf.pasning", learning_point_ids: ["lm.10-12.pasning.1"] }, { "tema.egen.abc": "Omstilling" });
    expect(l).toMatchObject({ hovedtema: ["tema.egen.abc"], delferdigheter: ["delf.pasning"], learningPoints: ["lm.10-12.pasning.1"] });
    expect(linkName(l, "tema.egen.abc")).toBe("Omstilling");
    expect(linkName(l, "delf.pasning")).toBe("Pasning");
    expect(l?.picked?.points[0]?.text).toBe(learningPoint("lm.10-12.pasning.1")?.text);
  });

  it("tells KI the picked terms and learning points, not the word list", () => {
    const l = pickedLink({ hovedtema_id: "tema.spille-framover", delferdighet_id: null, learning_point_ids: ["lm.10-12.pasning.1"] });
    const text = fagplanText("10-12", "Spille oss framover i banen", l);
    expect(text).toContain("## Månedens NFF-begreper (valgt av trenerne i årshjulet)");
    expect(text).toContain(`- ${learningPoint("lm.10-12.pasning.1")?.text}`);
    expect(text).not.toContain("Temaet koblet til NFF");
  });
});
