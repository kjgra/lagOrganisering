import "server-only";
import path from "node:path";
import {
  Circle,
  Document,
  Font,
  Line,
  Page,
  Polygon,
  Polyline,
  Rect,
  renderToBuffer,
  StyleSheet,
  Svg,
  Text,
  View,
  Link,
} from "@react-pdf/renderer";
import { drawingShapes, COLOURS, type Drawing, type Shape } from "@/lib/plans/drawing";
import { schedule, sourceText, type Plan } from "@/lib/plans/plan";

/**
 * The training plan as a PDF (replaces the old app's Typst template): page 1
 * with focus, keywords, schedule with rotation, closing questions, groups
 * and the legend; one page per exercise with the drawing. Player names come
 * only from the approved team proposal when the PDF is made; never stored.
 */

type OneStyle = Parameters<typeof StyleSheet.create>[0][string];
type TextStyle = OneStyle | OneStyle[];

const FONTS = path.join(process.cwd(), "lib", "pdf", "fonts");
let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Barlow",
    fonts: [
      { src: path.join(FONTS, "Barlow-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONTS, "Barlow-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(FONTS, "Barlow-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONTS, "Barlow-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "BarlowCondensed",
    fonts: [
      { src: path.join(FONTS, "BarlowCondensed-Bold.ttf"), fontWeight: 700 },
      { src: path.join(FONTS, "BarlowCondensed-ExtraBold.ttf"), fontWeight: 800 },
    ],
  });
  // Norwegian words are not hyphenated.
  Font.registerHyphenationCallback((w) => [w]);
  registered = true;
}

const BLACK = "#121212";
const YELLOW = "#FFC629";
const YELLOW_SOFT = "#FFF3CC";
const YELLOW_INK = "#6B4E00";
const GREY = "#5E5E5E";
const LINE = "#E3E1DB";
const GROUND = "#F8F7F4";

const s = StyleSheet.create({
  page: { fontFamily: "Barlow", fontSize: 10, color: BLACK, paddingTop: 54, paddingBottom: 48, paddingHorizontal: 51 },
  band: { position: "absolute", top: 0, left: 0, right: 0, height: 20, backgroundColor: BLACK },
  bandYellow: { position: "absolute", top: 17, left: 0, right: 0, height: 3.4, backgroundColor: YELLOW },
  footer: { position: "absolute", bottom: 22, left: 51, right: 51, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: GREY },
  title: { fontFamily: "BarlowCondensed", fontWeight: 800, fontSize: 27 },
  subtitle: { fontSize: 11.5, color: GREY, marginTop: 2 },
  info: { fontSize: 9.5, fontWeight: 600, marginTop: 4 },
  focus: { backgroundColor: YELLOW_SOFT, padding: 10, borderRadius: 4, marginTop: 12 },
  section: { flexDirection: "row", alignItems: "center", marginTop: 13, marginBottom: 6 },
  sectionMark: { width: 4, height: 11, backgroundColor: YELLOW, marginRight: 6 },
  sectionText: { fontFamily: "BarlowCondensed", fontWeight: 700, fontSize: 13.5 },
  sub: { fontFamily: "BarlowCondensed", fontWeight: 700, fontSize: 12, marginTop: 10, marginBottom: 4 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletMark: { width: 10 },
  note: { fontSize: 9, color: GREY, marginTop: 4 },
  table: { borderWidth: 0.5, borderColor: LINE },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderColor: LINE },
  cell: { paddingHorizontal: 7, paddingVertical: 5, borderLeftWidth: 0.5, borderColor: LINE, flex: 1 },
  timeCell: { paddingHorizontal: 7, paddingVertical: 5, width: 52 },
  label: { alignSelf: "flex-start", backgroundColor: BLACK, color: YELLOW, fontWeight: 700, fontSize: 9, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 3, marginBottom: 8, letterSpacing: 0.6 },
  exName: { fontFamily: "BarlowCondensed", fontWeight: 800, fontSize: 23 },
  cols: { flexDirection: "row", gap: 18, marginTop: 6 },
  col: { flex: 1 },
});

/** **double asterisks** become bold; nothing else is markup. */
function Rich({ text, style }: { text: string; style?: TextStyle }) {
  const parts = text.split("**");
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        i % 2 ? (
          <Text key={i} style={{ fontWeight: 700 }}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function Bullets({ items, question }: { items: string[]; question?: boolean }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={[s.bulletMark, question ? { color: YELLOW_INK, fontWeight: 700 } : {}]}>{question ? "?" : "•"}</Text>
          <Rich text={t} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

function Section({ children }: { children: string }) {
  return (
    <View style={s.section} minPresenceAhead={40}>
      <View style={s.sectionMark} />
      <Text style={s.sectionText}>{children}</Text>
    </View>
  );
}

function ShapeEl({ sh, k }: { sh: Shape; k: number }) {
  switch (sh.k) {
    case "rect":
      return <Rect key={k} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} fill={sh.fill ?? "none"} stroke={sh.stroke} strokeWidth={sh.sw} fillOpacity={sh.opacity} />;
    case "circle":
      // react-pdf does not read rgba(); the shadow becomes black with opacity.
      if (sh.fill === COLOURS.shadow) return <Circle key={k} cx={sh.cx} cy={sh.cy} r={sh.r} fill="#000000" fillOpacity={0.33} />;
      return <Circle key={k} cx={sh.cx} cy={sh.cy} r={sh.r} fill={sh.fill ?? "none"} stroke={sh.stroke} strokeWidth={sh.sw} />;
    case "poly": {
      const pts = sh.points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      return sh.closed ? (
        <Polygon key={k} points={pts} fill={sh.fill ?? "none"} stroke={sh.stroke} strokeWidth={sh.sw} />
      ) : (
        <Polyline key={k} points={pts} fill="none" stroke={sh.stroke} strokeWidth={sh.sw} strokeDasharray={sh.dash?.map((x) => x.toFixed(1)).join(" ")} />
      );
    }
    case "text":
      return (
        <Text key={k} x={sh.x} y={sh.y + sh.size * 0.35} fill={sh.fill} textAnchor={sh.anchor ?? "middle"} style={{ fontSize: sh.size, fontWeight: sh.bold ? 700 : 400, fontFamily: "Barlow" }}>
          {sh.text}
        </Text>
      );
  }
}

function DrawingPdf({ d, maxWidth, maxHeight }: { d: Drawing; maxWidth: number; maxHeight: number }) {
  const { width, height, shapes } = drawingShapes(d, 1200);
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`}>
        {shapes.map((sh, i) => (
          <ShapeEl key={i} sh={sh} k={i} />
        ))}
      </Svg>
    </View>
  );
}

/** The legend in the style of the drawings. */
function Legend({ width }: { width: number }) {
  const h = 30;
  const r = 7;
  const step = width / 8.5;
  const items: React.ReactNode[] = [];
  let x = step * 0.25;
  const label = (t: string, at: number) => (
    <Text key={`l${t}`} x={at} y={h / 2 + 3.5} fill="#FFFFFF" style={{ fontSize: 9.5, fontFamily: "Barlow" }}>
      {t}
    </Text>
  );
  const person = (fill: string, txt: string, name: string) => {
    items.push(<Circle key={`c${name}`} cx={x} cy={h / 2} r={r} fill={fill} stroke="#FFFFFF" strokeWidth={1} />);
    if (txt) items.push(<Text key={`t${name}`} x={x} y={h / 2 + 3} fill="#FFFFFF" textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fontFamily: "Barlow" }}>{txt}</Text>);
    items.push(label(name, x + r * 1.6));
    x += step;
  };
  person(COLOURS.team["1"], "", "Lag 1");
  person(COLOURS.team["2"], "", "Lag 2");
  person(COLOURS.trainer, "T", "Trener");
  items.push(<Circle key="ball" cx={x} cy={h / 2} r={4} fill="#FFFFFF" stroke={BLACK} strokeWidth={0.8} />);
  items.push(label("Ball", x + r * 1.2));
  x += step * 0.8;
  items.push(<Polygon key="cone" points={`${x - 5},${h / 2 + 4} ${x + 5},${h / 2 + 4} ${x},${h / 2 - 6}`} fill={COLOURS.cone.oransje} stroke="#c45c00" strokeWidth={0.5} />);
  items.push(label("Kjegle", x + r * 1.2));
  x += step;
  const arrow = (type: string, name: string) => {
    const col = type === "pasning" ? "#FFFFFF" : BLACK;
    items.push(<Line key={`a${name}`} x1={x} y1={h / 2} x2={x + step * 0.38} y2={h / 2} stroke={col} strokeWidth={1.6} strokeDasharray={type === "lop" ? "3 3" : undefined} />);
    items.push(<Polygon key={`h${name}`} points={`${x + step * 0.45},${h / 2} ${x + step * 0.37},${h / 2 - 3.5} ${x + step * 0.37},${h / 2 + 3.5}`} fill={col} />);
    items.push(label(name, x + step * 0.5));
    x += step;
  };
  arrow("pasning", "Pasning");
  arrow("lop", "Løp");
  arrow("foring", "Føring");
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Rect x={0} y={0} width={width} height={h} fill={COLOURS.grass[1]} />
      {items}
    </Svg>
  );
}

export interface PdfInput {
  plan: Plan;
  /** Lines under the title, e.g. date and team. */
  info: string[];
  footer: string;
  groups: { name: string; players: string[] }[];
}

function PlanDocument({ plan: p, info, footer, groups }: PdfInput) {
  const sched = schedule(p, groups.map((g) => g.name));
  const contentWidth = 595 - 2 * 51;
  const pageChrome = (
    <>
      <View style={s.band} fixed />
      <View style={s.bandYellow} fixed />
      <View style={s.footer} fixed>
        <Text>{footer}</Text>
        <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages}`} />
      </View>
    </>
  );
  return (
    <Document title={p.tittel} author="Nymark – Gruppeorganisering" language="nb">
      <Page size="A4" style={s.page}>
        {pageChrome}
        <Text style={s.title}>{p.tittel}</Text>
        {p.undertittel ? <Text style={s.subtitle}>{p.undertittel}</Text> : null}
        {info.length ? <Text style={s.info}>{info.join("  ·  ")}</Text> : null}
        {p.fokus.forsvar || p.fokus.angrep ? (
          <View style={s.focus}>
            <Text style={{ fontFamily: "BarlowCondensed", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Dette jobber vi med</Text>
            <View style={{ flexDirection: "row", gap: 14 }}>
              {p.fokus.forsvar ? <Rich style={{ flex: 1 }} text={`**Forsvar:** ${p.fokus.forsvar}`} /> : null}
              {p.fokus.angrep ? <Rich style={{ flex: 1 }} text={`**Angrep:** ${p.fokus.angrep}`} /> : null}
            </View>
          </View>
        ) : null}
        {p.stikkord.length ? (
          <>
            <Section>{p.stikkord.length === 1 ? "Stikkord for hele økta" : `${p.stikkord.length} stikkord for hele økta`}</Section>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {p.stikkord.map((k, i) => (
                <View key={i} style={{ flex: 1, borderTopWidth: 3, borderTopColor: YELLOW, borderWidth: 0.6, borderColor: LINE, padding: 8 }}>
                  <Text style={{ fontWeight: 700 }}>
                    {i + 1}. {k.tittel}
                  </Text>
                  <Rich text={k.tekst} />
                </View>
              ))}
            </View>
            {p.stikkord_merknad ? <Rich style={s.note} text={p.stikkord_merknad} /> : null}
          </>
        ) : null}
        <Section>{`Tidsplan${sched.columns.length > 2 ? " og rotasjon" : ""} · ${sched.total} min`}</Section>
        <View style={s.table}>
          <View style={{ flexDirection: "row", backgroundColor: BLACK }}>
            {sched.columns.map((c, i) => (
              <Text key={i} style={[i === 0 ? s.timeCell : s.cell, { color: "#FFFFFF", fontWeight: 700 }]}>
                {c}
              </Text>
            ))}
          </View>
          {sched.rows.map((r, i) => (
            <View key={i} style={[s.row, r.felles ? { backgroundColor: YELLOW_SOFT } : {}]} wrap={false}>
              <Text style={s.timeCell}>{r.tid}</Text>
              {r.felles ? (
                <Rich style={[s.cell, { flex: sched.columns.length - 1 }]} text={r.tekst ?? ""} />
              ) : (
                (r.celler ?? []).map((c, j) => (
                  <Text key={j} style={s.cell}>
                    {c}
                  </Text>
                ))
              )}
            </View>
          ))}
        </View>
        {p.tidsplan.merknad ? <Rich style={s.note} text={p.tidsplan.merknad} /> : null}
        {p.avslutning_sporsmal.length ? (
          <>
            <Section>Felles avslutning – spør, ikke fortell</Section>
            <Bullets items={p.avslutning_sporsmal} question />
          </>
        ) : null}
        {groups.length ? (
          <>
            <Section>Grupper</Section>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {groups.map((g, i) => (
                <View key={i} style={{ width: (contentWidth - 6 * (Math.min(groups.length, 4) - 1)) / Math.min(groups.length, 4), padding: 8, backgroundColor: GROUND, borderRadius: 4 }}>
                  <Text style={{ fontWeight: 700 }}>{g.name}</Text>
                  <Text style={{ fontSize: 9 }}>{g.players.join(", ")}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        <Section>Tegnforklaring</Section>
        <Legend width={contentWidth} />
        {p.kilde ? <Rich style={[s.note, { marginTop: 8 }]} text={p.kilde} /> : null}
      </Page>
      {p.ovelser.map((e, i) => (
        <Page key={i} size="A4" style={s.page}>
          {pageChrome}
          <Text style={s.label}>{`ØVELSE ${i + 1}${e.kategori ? ` · ${e.kategori.toUpperCase()}` : ""}`}</Text>
          <Text style={s.exName}>{e.navn}</Text>
          {e.fokus ? <Rich style={{ color: GREY, marginBottom: 4 }} text={`**Fokus:** ${e.fokus}`} /> : null}
          {e.tegning ? <DrawingPdf d={e.tegning} maxWidth={contentWidth} maxHeight={355} /> : null}
          <View style={s.cols}>
            <View style={s.col}>
              {e.organisering.length ? (
                <>
                  <Text style={s.sub}>Organisering</Text>
                  <Bullets items={e.organisering} />
                </>
              ) : null}
              {e.gjennomforing.length ? (
                <>
                  <Text style={s.sub}>Gjennomføring</Text>
                  <Bullets items={e.gjennomforing} />
                </>
              ) : null}
              {e.tilpasning.length ? (
                <>
                  <Text style={s.sub}>Tilpasning</Text>
                  <Bullets items={e.tilpasning} />
                </>
              ) : null}
            </View>
            <View style={s.col}>
              {e.laeringsmomenter.length ? (
                <>
                  <Text style={s.sub}>Læringsmomenter</Text>
                  <Bullets items={e.laeringsmomenter} />
                </>
              ) : null}
              {e.sporsmal.length ? (
                <>
                  <Text style={s.sub}>Spørsmål til spillerne</Text>
                  <Bullets items={e.sporsmal} question />
                </>
              ) : null}
              {e.enklere || e.vanskeligere ? (
                <>
                  <Text style={s.sub}>Variasjoner</Text>
                  {e.enklere ? <Rich text={`**Enklere:** ${e.enklere}`} style={{ marginBottom: 4 }} /> : null}
                  {e.vanskeligere ? <Rich text={`**Vanskeligere:** ${e.vanskeligere}`} /> : null}
                </>
              ) : null}
              {e.nff_url ? (
                <>
                  <Text style={s.sub}>Kilde</Text>
                  <Text style={{ fontSize: 9 }}>
                    {sourceText(e.nff_url)} <Link src={e.nff_url}>{e.nff_url}</Link>
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}

export async function planPdf(input: PdfInput): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<PlanDocument {...input} />);
}
