module.exports = [
(()=>{"use strict";return[
"[project]/lib/demo/seed.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "seedDemo",
    ()=>seedDemo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/format.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/drawing.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/fagplan.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/bank-proposals.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/exercise-values.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/plan.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$reference$2d$plan$2e$json$2e5b$json$5d2e$cjs__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/reference-plan.json.[json].cjs [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$spond$2f$mock$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/spond/mock.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/improvements.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$training$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/store/training.ts [instrumentation] (ecmascript) <locals>");
;
;
;
;
;
;
;
;
;
;
;
async function seedDemo(d) {
    await seedAccess(d);
    await seedTraining(d);
}
async function seedAccess(d) {
    const done = await d.query("SELECT 1 FROM app_roles WHERE spond_profile_id = 'P-ANN'");
    if (done.length) return;
    await d.tx(async (t)=>{
        await t.query(`INSERT INTO app_roles (spond_profile_id, can_use_app, can_use_ai, is_admin, updated_by) VALUES
         ('P-ANN', true, true, false, 'P-KJETIL'),
         ('P-PER', true, false, false, 'P-KJETIL'),
         ('P-LISE', true, false, false, 'P-KJETIL')`);
        await t.query(`INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-2', 'Keeper', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-7', 'Keeper', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-3', 'Venstrebein', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-5', 'Ny', 'P-ANN'),
         ('G-FOTBALL', 'M-S-G2016-9', 'Forsvar', 'P-ANN'),
         ('G-FOTBALL', 'M-S-G2016-12', 'Kaptein', 'P-ANN'),
         ('G-FOTBALL', 'M-S-J2016-1', 'Keeper', 'P-BEATE')`);
        await t.query(`INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-1', 3, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-3', 3, 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-4', 2, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-6', 1, 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-8', 2, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-10', 1, 'P-KJETIL')`);
        await t.query(`INSERT INTO member_pairs (spond_group_id, member_a, member_b, created_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-4', 'M-S-G2016-6', 'P-KJETIL')`);
    });
}
const REF_CATEGORY = {
    "3-mot-1-alltid-to-alternativer": "pasning_mottak",
    "hjem-bak-ballen": "forsvar",
    "4-mot-4-med-endesoner": "smaaspill"
};
const EXTRA = [
    {
        code: "rondo-4-mot-1",
        name: "Rondo 4 mot 1",
        category: "pasning_mottak",
        themes: [
            "Samhandling"
        ],
        organisation: "Rute 8 × 8 m\nFire på kantene, én i midten\nBytt midtspiller hvert minutt",
        execution: "Hold ballen i laget med maks to touch\nMidtspilleren prøver å vinne ballen",
        learning_points: "Åpen kropp mot banen\nSpill til foten lengst fra forsvareren"
    },
    {
        code: "smaaspill-3-mot-3",
        name: "Småspill 3 mot 3",
        category: "smaaspill",
        themes: [],
        organisation: "Bane 20 × 15 m med to småmål\nFire lag som bytter hvert tredje minutt",
        execution: "Fritt spill, innspark eller innføring ved sidelinjen",
        learning_points: "Bruk bredden\nHjem raskt når vi mister ballen"
    },
    {
        code: "sistemann-oppvarming",
        name: "Sistemann med ball",
        category: "oppvarming",
        themes: [],
        organisation: "Alle med ball i en rute 20 × 20 m",
        execution: "Før ballen rundt, trener roper øvelser: stopp, vend, sålen\nSiste mann som gjør riktig får en oppgave",
        learning_points: "Mange touch på ballen\nBlikket opp"
    }
];
async function seedTraining(d) {
    const done = await d.query("SELECT 1 FROM exercises WHERE spond_group_id = 'felles' LIMIT 1");
    if (done.length) return;
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validatePlan"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$reference$2d$plan$2e$json$2e5b$json$5d2e$cjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["default"]);
    const now = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(new Date());
    await d.tx(async (t)=>{
        for (const e of ref.ovelser){
            await t.query(`INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, questions,
                                easier, harder, nff_url, drawing, created_by, updated_by)
         VALUES ('felles', $1, $2, $3, $4::text[], $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), $12::jsonb, 'P-KJETIL', 'P-KJETIL')`, [
                e.kode,
                e.navn,
                REF_CATEGORY[e.kode] ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["categoryKey"])(e.kategori),
                [
                    ref.tema
                ],
                e.organisering.join("\n"),
                e.gjennomforing.join("\n"),
                e.laeringsmomenter.join("\n"),
                e.sporsmal.join("\n"),
                e.enklere,
                e.vanskeligere,
                e.nff_url,
                e.tegning ? JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["compactDrawing"])(e.tegning)) : null
            ]);
        }
        for (const e of EXTRA){
            await t.query(`INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, created_by, updated_by)
         VALUES ('felles', $1, $2, $3, $4::text[], $5, $6, $7, 'P-KJETIL', 'P-KJETIL')`, [
                e.code,
                e.name,
                e.category,
                e.themes,
                e.organisation,
                e.execution,
                e.learning_points
            ]);
        }
        // The reference plan's exercises are tagged with NFF's fagplan, so tags and filters can be tried.
        await t.query(`UPDATE exercises SET bands = '{8-9,10-12}', nff_activity = 'med-og-mot',
              nff_tags = '{tema.spille-framover,delf.pasning,delf.mottak,lm.10-12.spille-framover.laget.2}'
        WHERE spond_group_id = 'felles' AND code = ANY($1::text[])`, [
            ref.ovelser.map((e)=>e.kode)
        ]);
        const next = now.month === 12 ? {
            year: now.year + 1,
            month: 1
        } : {
            year: now.year,
            month: now.month + 1
        };
        await t.query(`INSERT INTO season_themes (spond_group_id, year, month, theme, description, updated_by) VALUES
         ('G-FOTBALL', $1, $2, $3, 'Spille på lag: være spillbar, og hjem raskt når vi mister ballen.', 'P-KJETIL'),
         ('G-FOTBALL', $4, $5, 'Avslutning', 'Komme til avslutning og skyte med riktig del av foten.', 'P-KJETIL')`, [
            now.year,
            now.month,
            ref.tema || "Samhandling",
            next.year,
            next.month
        ]);
        // An approved plan for the last training of Gutter 2016, so the evaluation can be tried.
        const last = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$spond$2f$mock$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["mockEvents"])().filter((e)=>e.id.startsWith("E-S-G2016-") && !e.matchEvent && Date.parse(e.endTimestamp ?? "") < Date.now()).sort((a, b)=>(b.startTimestamp ?? "").localeCompare(a.startTimestamp ?? ""))[0];
        if (last) {
            await t.query(`INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, source, status, created_by, approved_by, approved_at, event_start, event_end)
         VALUES ('G-FOTBALL', $1, 1, $2::jsonb, 'manual', 'approved', 'P-ANN', 'P-KJETIL', now(), $3::timestamptz, $4::timestamptz)`, [
                last.id,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["planJson"])(ref),
                last.startTimestamp ?? null,
                last.endTimestamp ?? null
            ]);
        }
        await t.query(`INSERT INTO team_settings (spond_group_id, birth_year, gender, session_minutes, pitch, equipment, updated_by)
       VALUES ('G-FOTBALL', 2016, 'gutter', 75, 'Deler med G11 annenhver uke', 'Kjegler, vester i fire farger, 6 småmål, 20 baller', 'P-KJETIL')`);
        await t.query("INSERT INTO team_principles (spond_group_id, body, created_by) VALUES ('G-FOTBALL', 'Mye ballkontakt, lite kø. Alle skal oppleve mestring.', 'P-KJETIL')");
        await t.query("INSERT INTO team_pitches (spond_group_id, pitch_id) VALUES ('G-FOTBALL', 8876), ('G-FOTBALL', 3985)");
        // Faste baner for tirsdag og torsdag that end in two weeks, so the reminder can be seen.
        await t.query(`INSERT INTO weekday_pitches (spond_group_id, weekday, valid_from, valid_to, pitch_ids, updated_by)
       VALUES ('G-FOTBALL', 2, $1::date, $2::date, '{8876}', 'P-KJETIL'), ('G-FOTBALL', 4, $1::date, $2::date, '{3985}', 'P-KJETIL')`, [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloDate"])(new Date(Date.now() - 60 * 86_400_000)),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloDate"])(new Date(Date.now() + 14 * 86_400_000))
        ]);
        await seedProposals(t);
    });
}
/** Two proposals for the whole bank in «Forbedringer», as the nightly run makes them, so they can be tried. */ async function seedProposals(d) {
    const access = {
        profileId: "P-KJETIL",
        groupIds: new Set([
            "G-FOTBALL"
        ])
    };
    const last = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$training$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["listExercises"])(d, access, "G-FOTBALL")).find((e)=>e.code === "sistemann-oppvarming");
    if (!last) return;
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseValues"])(last);
    const missing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["missingFields"])(base).filter((k)=>k !== "bands");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["saveProposal"])(d, {
        code: last.code,
        kind: "metadata",
        reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["metadataReason"])(missing),
        signature: `metadata:${missing.join(",")}`,
        base,
        proposed: {
            ...base,
            min_players: "6",
            max_players: "16",
            duration_minutes: "10",
            area: "20 × 20 m",
            nff_activity: "sjef-intro",
            nff_tags: [
                "delf.foring",
                "delf.vending"
            ]
        },
        model: null,
        costUsd: 0
    });
    const tema = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["HOVEDTEMA"].find((x)=>x.key === "score-mal");
    const gap = {
        band: "6-7",
        tema,
        have: 0
    };
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["saveProposal"])(d, {
        code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["gapCode"])(gap),
        kind: "ny_ovelse",
        reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["gapReason"])(gap),
        signature: "ny_ovelse",
        base: {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["emptyValues"])(),
            bands: [
                "6-7"
            ]
        },
        proposed: {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$bank$2d$proposals$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["emptyValues"])(),
            name: "Skattejakt med småmål",
            category: "avslutning",
            themes: tema.label,
            min_players: "4",
            max_players: "12",
            duration_minutes: "12",
            area: "15 × 20 m",
            organisation: "Fire småmål i hvert hjørne av ruta\nAlle har hver sin ball\nTo lag med vester",
            execution: "Driv ballen og score i så mange mål du klarer på ett minutt\nTell målene høyt\nNy runde: bare mål med venstre fot",
            learning_points: "Blikket opp før du skyter\nSkyt med innsiden for å treffe",
            questions: "Hvilket mål var lettest å score i, og hvorfor?",
            easier: "Større mål, eller færre spillere i ruta",
            harder: "En forsvarer som kan ta ballen",
            status: "candidate",
            bands: [
                "6-7"
            ],
            nff_activity: "sjef-intro",
            nff_tags: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["temaTag"])(tema.key),
                "delf.skudd"
            ]
        },
        model: null,
        costUsd: 0
    });
}
}),
"[project]/lib/format.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Norwegian dates and numbers, always in Oslo time (the server may run in UTC).
 * Style from the design system: «Tor 15. okt», «17:30–18:45».
 */ __turbopack_context__.s([
    "MONTH_NAMES",
    ()=>MONTH_NAMES,
    "TZ",
    ()=>TZ,
    "clock",
    ()=>clock,
    "dayLabel",
    ()=>dayLabel,
    "decimal",
    ()=>decimal,
    "longDate",
    ()=>longDate,
    "osloDate",
    ()=>osloDate,
    "osloMidnight",
    ()=>osloMidnight,
    "osloMonthStart",
    ()=>osloMonthStart,
    "osloParts",
    ()=>osloParts,
    "pastSection",
    ()=>pastSection,
    "plural",
    ()=>plural,
    "savedAt",
    ()=>savedAt,
    "shortDate",
    ()=>shortDate,
    "timeRange",
    ()=>timeRange,
    "weekSection",
    ()=>weekSection,
    "weekStart",
    ()=>weekStart,
    "weekdayShort",
    ()=>weekdayShort
]);
const TZ = "Europe/Oslo";
const WEEKDAYS = [
    "Søn",
    "Man",
    "Tir",
    "Ons",
    "Tor",
    "Fre",
    "Lør"
];
const WEEKDAYS_LONG = [
    "søndag",
    "mandag",
    "tirsdag",
    "onsdag",
    "torsdag",
    "fredag",
    "lørdag"
];
const MONTHS = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "des"
];
const MONTH_NAMES = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember"
];
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short"
});
const WD = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};
function osloParts(d) {
    const date = typeof d === "string" ? new Date(d) : d;
    const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x)=>[
            x.type,
            x.value
        ]));
    return {
        year: Number(p.year),
        month: Number(p.month),
        day: Number(p.day),
        weekday: WD[p.weekday] ?? 0,
        hour: Number(p.hour),
        minute: Number(p.minute)
    };
}
const pad = (n)=>String(n).padStart(2, "0");
function clock(d) {
    const p = osloParts(d);
    return `${pad(p.hour)}:${pad(p.minute)}`;
}
function weekdayShort(d) {
    return WEEKDAYS[osloParts(d).weekday];
}
function dayLabel(d, now = new Date()) {
    const p = osloParts(d);
    const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
    return `${WEEKDAYS[p.weekday]} ${p.day}. ${MONTHS[p.month - 1]}${y}`;
}
function longDate(d) {
    const p = osloParts(d);
    return `${WEEKDAYS_LONG[p.weekday]} ${p.day}. ${MONTH_NAMES[p.month - 1].toLowerCase()} ${p.year} kl. ${clock(d)}`;
}
function timeRange(start, end, now = new Date()) {
    if (!start) return "Tid ikke satt";
    if (!end) return clock(start);
    const sameDay = osloDate(start) === osloDate(end);
    return `${clock(start)}–${sameDay ? "" : `${dayLabel(end, now)} `}${clock(end)}`;
}
function osloDate(d) {
    const p = osloParts(d);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
function savedAt(d, now = new Date()) {
    const day = osloDate(d);
    const today = osloDate(now);
    const yesterday = osloDate(new Date(now.getTime() - 86_400_000));
    const when = day === today ? "i dag" : day === yesterday ? "i går" : shortDate(d, now);
    return `${when} kl. ${clock(d)}`;
}
function shortDate(d, now = new Date()) {
    const p = osloParts(d);
    const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
    return `${p.day}. ${MONTHS[p.month - 1]}${y}`;
}
function weekStart(d) {
    const p = osloParts(d);
    const mondayOffset = (p.weekday + 6) % 7;
    const noon = Date.UTC(p.year, p.month - 1, p.day, 12) - mondayOffset * 86_400_000;
    const x = new Date(noon);
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}
function weekSection(d, now = new Date()) {
    const w = weekStart(d);
    const thisWeek = weekStart(now);
    const nextWeek = weekStart(new Date(now.getTime() + 7 * 86_400_000));
    if (w === thisWeek) return "Denne uken";
    if (w === nextWeek) return "Neste uke";
    const p = osloParts(d);
    return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}
function pastSection(d, now = new Date()) {
    const w = weekStart(d);
    if (w === weekStart(now)) return "Denne uken";
    if (w === weekStart(new Date(now.getTime() - 7 * 86_400_000))) return "Forrige uke";
    const p = osloParts(d);
    return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}
function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
}
function decimal(x, digits = 2) {
    return x.toFixed(digits).replace(".", ",");
}
function osloMonthStart(now = new Date(), monthsBack = 0) {
    const p = osloParts(now);
    const m = p.year * 12 + (p.month - 1) - monthsBack;
    return osloMidnight(Math.floor(m / 12), m % 12 + 1, 1);
}
/** Minutes Oslo is ahead of UTC at the instant `d` (60 or 120). */ function osloOffsetMinutes(d) {
    const p = osloParts(d);
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    return Math.round((local - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
}
function osloMidnight(year, month, day) {
    const guess = Date.UTC(year, month - 1, day);
    let t = guess - osloOffsetMinutes(new Date(guess)) * 60_000;
    t = guess - osloOffsetMinutes(new Date(t)) * 60_000;
    return new Date(t);
}
}),
"[project]/lib/nff/bands.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// NFF's age bands for barnefotball (Planverk 2026 on tiim.no, made by NFF). A team stores its
// birth year, so its band and match format move up by themselves each season. Bands stop at
// 12 for now; ungdom (13–19) can be added later.
__turbopack_context__.s([
    "BIRTH_YEAR_MAX",
    ()=>BIRTH_YEAR_MAX,
    "BIRTH_YEAR_MIN",
    ()=>BIRTH_YEAR_MIN,
    "GENDERS",
    ()=>GENDERS,
    "NFF_BANDS",
    ()=>NFF_BANDS,
    "bandFor",
    ()=>bandFor,
    "formatFor",
    ()=>formatFor,
    "seasonAge",
    ()=>seasonAge,
    "teamAge",
    ()=>teamAge,
    "teamAgeText",
    ()=>teamAgeText,
    "teamBand",
    ()=>teamBand
]);
const GENDERS = {
    gutter: "Gutter",
    jenter: "Jenter",
    mix: "Mix"
};
const NFF_BANDS = [
    {
        key: "6-7",
        label: "6–7 år",
        from: 6,
        to: 7
    },
    {
        key: "8-9",
        label: "8–9 år",
        from: 8,
        to: 9
    },
    {
        key: "10-12",
        label: "10–12 år",
        from: 10,
        to: 12
    }
];
const BIRTH_YEAR_MIN = 2000;
const BIRTH_YEAR_MAX = 2100;
function seasonAge(birthYear, year) {
    return year - birthYear;
}
function bandFor(age) {
    return NFF_BANDS.find((b)=>age >= b.from && age <= b.to) ?? null;
}
function formatFor(age) {
    if (age >= 6 && age <= 7) return "treerfotball";
    if (age >= 8 && age <= 9) return "femmerfotball";
    if (age >= 10 && age <= 11) return "sjuerfotball";
    if (age === 12) return "nierfotball";
    return null;
}
function teamBand(birthYear, year) {
    return birthYear ? bandFor(seasonAge(birthYear, year))?.key ?? null : null;
}
function teamAge(birthYear, gender, year) {
    const age = seasonAge(birthYear, year);
    const letter = gender === "gutter" ? "G" : gender === "jenter" ? "J" : "";
    return {
        short: letter ? `${letter}${age}` : `${age} år`,
        age,
        band: bandFor(age),
        format: formatFor(age)
    };
}
function teamAgeText(birthYear, gender, year, fallback = "") {
    if (birthYear === null) return fallback;
    const t = teamAge(birthYear, gender, year);
    const band = t.band ? `NFF-bånd ${t.band.label}` : "utenfor NFFs barnefotball (6–12 år)";
    return [
        `${t.short} (født ${birthYear})`,
        band,
        t.format
    ].filter(Boolean).join(" · ");
}
}),
"[project]/lib/nff/fagplan.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// NFFs fagplaner for barnefotball (Planverk 2026 på tiim.no), som katalog øvelsene tagges med:
// hovedtema (spillfase), aktivitetskategori, delferdigheter og læringsmomenter per bånd.
// Hentet 2026-10-24 fra https://tiim.no/tema/fagplaner-og-spillmodeller. Teksten er NFFs,
// med åpenbare skrivefeil rettet. Endrer NFF planverket, oppdateres denne fila; koder som
// forsvinner, blir ignorert på øvelser som har dem.
//
// Katalogen ligger også i databasen (nff_topics, nff_learning_points; se
// lib/store/nff-catalog.ts), der lagene kan legge til egne og skjule punkter. En
// endring her trenger en ny migrering, og tests/unit/nff-catalog.test.ts sjekker
// at de to stemmer.
__turbopack_context__.s([
    "AKTIVITETER",
    ()=>AKTIVITETER,
    "BAND_KEYS",
    ()=>BAND_KEYS,
    "DELFERDIGHETER",
    ()=>DELFERDIGHETER,
    "FAGPLAN_URLS",
    ()=>FAGPLAN_URLS,
    "HOVEDTEMA",
    ()=>HOVEDTEMA,
    "LEARNING_POINTS",
    ()=>LEARNING_POINTS,
    "ROLES",
    ()=>ROLES,
    "aktivitetLabel",
    ()=>aktivitetLabel,
    "delfTag",
    ()=>delfTag,
    "isKnownTag",
    ()=>isKnownTag,
    "learningPoint",
    ()=>learningPoint,
    "matchHovedtema",
    ()=>matchHovedtema,
    "nffSummary",
    ()=>nffSummary,
    "tagLabel",
    ()=>tagLabel,
    "temaTag",
    ()=>temaTag
]);
const BAND_KEYS = [
    "6-7",
    "8-9",
    "10-12"
];
const FAGPLAN_URLS = {
    "6-7": "https://tiim.no/artikkel/fagplan-6-7-ar-treerfotball",
    "8-9": "https://tiim.no/artikkel/fagplan-8-9-ar-femmerfotball",
    "10-12": "https://tiim.no/artikkel/fagplan-10-12-ar-syverfotball-og-nierfoball"
};
const HOVEDTEMA = [
    {
        key: "score-mal",
        label: "Score mål",
        side: "angrep",
        bands: [
            "6-7"
        ]
    },
    {
        key: "hindre-mal",
        label: "Hindre mål",
        side: "forsvar",
        bands: [
            "6-7"
        ]
    },
    {
        key: "spille-framover",
        label: "Spille oss framover i banen",
        side: "angrep",
        bands: [
            "8-9",
            "10-12"
        ]
    },
    {
        key: "komme-til-avslutning",
        label: "Komme til avslutning, score mål",
        side: "angrep",
        bands: [
            "8-9",
            "10-12"
        ]
    },
    {
        key: "vinne-ball",
        label: "Vinne ball, hindre motstander å spille forbi oss",
        side: "forsvar",
        bands: [
            "8-9",
            "10-12"
        ]
    },
    {
        key: "hindre-avslutning",
        label: "Hindre avslutning, hindre mål",
        side: "forsvar",
        bands: [
            "8-9",
            "10-12"
        ]
    }
];
const AKTIVITETER = [
    {
        key: "sjef-intro",
        label: "Sjef over ballen – introduksjon",
        share: "25 % (sammen med repetisjon)",
        laering: "Teknisk: rolig tempo, få valg, trener på utførelsen (kropp, fot, balanse, rytme)"
    },
    {
        key: "sjef-repetisjon",
        label: "Sjef over ballen – repetisjon uten gjentagelse",
        share: "25 % (sammen med introduksjon)",
        laering: "Teknisk: samme ferdighet, med små endringer som tvinger fram tilpasning (retning, fart, sprett, avstand, tidspress, signal)"
    },
    {
        key: "med-og-mot",
        label: "Spille med og mot",
        share: "25–40 %",
        laering: "Teknisk og taktisk"
    },
    {
        key: "spill",
        label: "Spill / smålagsspill",
        share: "30–50 %",
        laering: "Teknisk og taktisk"
    }
];
const DELFERDIGHETER = [
    {
        key: "foring",
        label: "Føring",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "vending",
        label: "Vending",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "dribling",
        label: "Dribling",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "pasning",
        label: "Pasning",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "mottak",
        label: "Medtak/mottak",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "skudd",
        label: "Skudd",
        side: "angrep",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "heading",
        label: "Heading",
        side: "angrep",
        bands: [
            "8-9",
            "10-12"
        ]
    },
    {
        key: "press",
        label: "Press/takling",
        side: "forsvar",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    },
    {
        key: "klarering",
        label: "Klarering",
        side: "forsvar",
        bands: [
            "8-9",
            "10-12"
        ]
    },
    {
        key: "kampen-om-ballen",
        label: "Kampen om ballen",
        side: "forsvar",
        bands: [
            "6-7",
            "8-9",
            "10-12"
        ]
    }
];
const ROLES = {
    ballforer: "Ballfører",
    laget: "Resten av laget",
    "1f": "Førsteforsvarer (1F)"
};
/**
 * Læringsmomenter per band. Keys: `<delferdighet>` or `<hovedtema>:<rolle>`.
 * Ids are `lm.<band>.<key with : as .>.<n>`, numbered from 1 through all groups.
 */ const LP = {
    "6-7": {
        foring: {
            "Før føringen": [
                "Se opp om det er plass foran deg.",
                "Bestem deg for om du vil gå rett frem eller svinge."
            ],
            "Under føringen": [
                "Bruk små, kontrollerte touch og ha ballen tett på foten din.",
                "Se opp av og til for å finne vei."
            ],
            "Etter føringen": [
                "Spill til en venn eller gå mot mål.",
                "Hvis du mister ballen, prøv å vinne den tilbake."
            ]
        },
        vending: {
            "Før vending": [
                "Se opp for å finne ledig plass.",
                "Bestem deg for hvilken vei du vil snu."
            ],
            "Under vending": [
                "Før ballen fremover.",
                "Stopp ballen med innsiden, utsiden eller sålen av foten.",
                "Snu kroppen samme vei som ballen.",
                "Før ballen i den nye retningen."
            ],
            "Etter vending": [
                "Løft blikket og se hvor motstandere, medspillere og målet er."
            ]
        },
        dribling: {
            "Før dribling": [
                "Se opp for å finne plass å gå med ballen."
            ],
            "Under dribling": [
                "Hold ballen nær foten.",
                "Lat som du går til en side, før du forter deg å gå til den andre siden."
            ],
            "Etter dribling": [
                "Løft blikket.",
                "Spill videre til en venn eller gå mot mål."
            ]
        },
        skudd: {
            "Før skudd": [
                "Se hvor målet er.",
                "Få ballen foran deg så du kan treffe den godt."
            ],
            "Under skudd": [
                "Se på ballen når du treffer.",
                "Sett standfoten ved siden av ballen.",
                "Bruk innsiden for å sikte eller vrist for å skyte hardt.",
                "Fullfør bevegelsen med skuddfoten og land på skuddfoten."
            ],
            "Etter skudd": [
                "Se om ballen gikk i mål.",
                "Vær klar for å skyte igjen hvis den kommer tilbake."
            ]
        },
        pasning: {
            "Før pasning (for viderekomne)": [
                "Se etter en venn du kan sende ballen til.",
                "Stå vendt mot dit du skal sende ballen.",
                "Bestem deg for hvilken fot du skal bruke."
            ],
            "Under pasning": [
                "Se på ballen når du treffer.",
                "Bruk innsiden av foten og treff midt på ballen.",
                "Spark ballen mot foten til vennen din."
            ],
            "Etter pasning": [
                "Se om ballen kom frem.",
                "Gjør deg klar til å få den tilbake."
            ]
        },
        mottak: {
            "Før mottak (for viderekomne)": [
                "Stå et sted der en medspiller kan sende ballen til deg.",
                "Vær vendt mot ballen.",
                "Si «ja!» eller «her!» når du vil ha ballen."
            ],
            "Under mottak": [
                "Se på ballen når den kommer.",
                "Ta et lite og mykt første touch med innsiden eller sålen av foten.",
                "Hold ballen nær foten."
            ],
            "Etter mottak": [
                "Løft blikket.",
                "Velg om du skal spille eller gå selv."
            ]
        },
        press: {
            "Før press/takling": [
                "Løp mot spilleren som har ballen."
            ],
            "Under press/takling": [
                "Kom deg nær ballen og motstanderen.",
                "Stå i veien så spilleren ikke kommer seg fremover.",
                "Prøv å ta ballen når motstanderen mister kontroll på ballen."
            ],
            "Etter press/takling": [
                "Hvis du vinner ballen: prøv å drible og komme deg fremover til en skuddmulighet eller en pasningsmulighet.",
                "Hvis du blir passert: prøv å stå i veien for spilleren på nytt."
            ]
        },
        "kampen-om-ballen": {
            "Før situasjonen": [
                "Følg med på hvor ballen går.",
                "Løp mot ballen, men stopp i tide slik at du ikke løper forbi.",
                "Stå med beina litt fra hverandre, klar til å flytte deg begge veier."
            ],
            "Under situasjonen": [
                "Kom nær motstanderen uten å dytte.",
                "Hold kroppen lav og stabil.",
                "Se på ballen og prøv å stoppe motstanderen når ballen blir litt løs."
            ],
            "Etter situasjonen": [
                "Hvis du vinner ballen, før den bort eller spill til medspiller.",
                "Hvis motstanderen får beholde ballen, følg etter og prøv igjen.",
                "Se deg rundt – hvor er lagkameratene dine?"
            ]
        },
        "score-mal:ballforer": {
            "Spille med og mot / spill": [
                "Få kontroll på ballen gjennom føre, vende, drible og skudd («meg og ballen»).",
                "Når spillerne mestrer dette: innlæring av pasning og mottak."
            ]
        },
        "hindre-mal:laget": {
            "Spille med og mot / spill": [
                "Når laget har mistet ball, alle raskt tilbake på plass mellom ballfører (1A) og eget mål.",
                "Forsvarer nærmest ballfører (1F) må hurtig og tett opp i ballfører (1A) for å vinne ball.",
                "Ny forsvarer (2F) klar hvis første forsvarer (1F) blir passert."
            ]
        }
    },
    "8-9": {
        mottak: {
            "Før medtak/mottak": [
                "Plasser deg slik at medspiller kan nå deg med en pasning uten å møte på blokkeringer.",
                "Frigjør deg fra motspiller med små bevegelser.",
                "Gi tydelig signal med stemme eller hånd når du ønsker å motta ballen."
            ],
            "Under medtak/mottak": [
                "Se på ballen i trefføyeblikket.",
                "Motta ballen med foten din som er nærmest motstanders mål dersom du ikke er under hardt press.",
                "Første touch til ledig rom, bort fra motstander."
            ],
            "Etter medtak/mottak": [
                "Løft blikket raskt.",
                "Velg neste handling (pasning, føring, skudd)."
            ]
        },
        dribling: {
            "Før dribling": [
                "Se opp og vurder om det er rom foran deg eller om du må skape det.",
                "Bestem om du vil utfordre til høyre eller venstre.",
                "Plasser ballen litt foran eller på foten du vil bruke."
            ],
            "Under dribling": [
                "Hold blikket opp så mye som mulig.",
                "Bruk hele kroppen til å finte (hofter, skuldre, blikk).",
                "Før ballen med foten som er lengst unna motstanderen."
            ],
            "Etter dribling": [
                "Akselerer forbi motstanderen etter at du har passert.",
                "Løft blikket for å finne ny løsning."
            ]
        },
        vending: {
            "Før vending": [
                "Orienter deg for å se om du skal vende.",
                "Velg retning ut fra hvor det er mest plass."
            ],
            "Under vending": [
                "Bruk innside, utside eller såle for å snu ballen.",
                "Ha ballen nær foten og vend med kontroll.",
                "Bruk kroppen til å skjerme ballen i vendingen."
            ],
            "Etter vending": [
                "Løft blikket og spill videre eller fortsett føringen.",
                "Sett fart i ny retning."
            ]
        },
        pasning: {
            "Før pasning": [
                "Vurder om du kan nå en medspiller langt fremme i banen eller om du må spille til noen i nærheten.",
                "Velg pasningstype (kort, lang, høy, lav)."
            ],
            "Under pasning": [
                "Blikket opp før tilslag for å sikte.",
                "Treff midt på ballen for flat pasning, under for løft, siden for skru.",
                "Treff ballen med innsiden eller utsiden av foten for korte pasninger, vrist for lange pasninger i lufta."
            ],
            "Etter pasning": [
                "Følg med på om pasningen lykkes.",
                "Beveg deg for å støtte angrepet eller vinne ballen tilbake."
            ]
        },
        foring: {
            "Før føringen": [
                "Sjekk om det er åpent rom eller motstandere i nærheten.",
                "Velg retning og tempo ut fra situasjonen."
            ],
            "Under føringen": [
                "Bruk små touch når det er trangt, lengre touch i åpent rom.",
                "Veksle mellom innside, utside og såle for å holde ballen unna motstandere.",
                "Hold blikket opp ofte."
            ],
            "Etter føringen": [
                "Velg om du vil sentre, drible videre eller skyte.",
                "Hvis du mister ballen, prøv å vinne den tilbake."
            ]
        },
        skudd: {
            "Før skudd": [
                "Se på mål og keeper for å finne plass å skyte.",
                "Velg skuddtype (innside for presisjon, vrist for kraft).",
                "Ta et kontrollert siste touch."
            ],
            "Under skudd": [
                "Blikket på ballen i tilslaget.",
                "Treffpunkt på ballen: midt for rett skudd, under for å løfte, siden for skru.",
                "Følg gjennom med foten i retning av skuddet."
            ],
            "Etter skudd": [
                "Følg opp returer med nytt skudd eller pasning.",
                "Omstill raskt om motstander vinner ballen."
            ]
        },
        heading: {
            "Før heading": [
                "Se ballbanen tidlig og vurder fart og høyde.",
                "Bruk små steg for å plassere deg riktig.",
                "Bestem deg for om du skal klarere ballen vekk eller forsøke å styre headingen til en medspiller eller på mål."
            ],
            "Under heading": [
                "Hopp til rett tid og møt ballen høyt.",
                "Se på ballen hele tiden.",
                "Treff ballen med panna.",
                "Bøy deg litt bakover før du støter overkroppen og hodet frem mot ballen."
            ],
            "Etter heading": [
                "Land med balanse og føtter klare for neste aksjon.",
                "Orienter deg raskt for å se hvor ballen havner."
            ]
        },
        press: {
            "Før press/takling": [
                "Se hvor ballen er på vei.",
                "Bestem om du vil presse innover eller utover.",
                "Start presset når du er nær nok til å påvirke."
            ],
            "Under press/takling": [
                "Tilnærm deg kontrollert og senk farten.",
                "Stå sidevendt for å stenge den ene siden.",
                "Hold blikket på ballen, ikke på finter.",
                "Takle når ballen er litt for langt fra foten til ballføreren."
            ],
            "Etter press/takling": [
                "Sikre ballen etter takling (pasning eller føring).",
                "Reis deg raskt om du faller.",
                "Finn ny posisjon om ballen spilles videre."
            ]
        },
        klarering: {
            "Før klarering": [
                "Se deg rundt – hvor er motspillere og medspillere?",
                "Flytt føttene slik at du er klar til å reagere raskt.",
                "Bruk armene til å skjerme og holde balanse."
            ],
            "Under klarering": [
                "Stå skrått – magen delvis mot motstanderens mål, delvis mot sidelinje.",
                "Bruk foten nærmest ballen for å klarere.",
                "Spark ballen høyt og langt."
            ],
            "Etter klarering": [
                "Push ut sammen med laget.",
                "Orienter deg raskt igjen – finn ball og spillere.",
                "Snakk sammen og hjelp hverandre med ny posisjon."
            ]
        },
        "kampen-om-ballen": {
            "Før situasjonen": [
                "Se hvor ballen havner og hvem som løper mot den.",
                "Kom raskt opp i riktig avstand – ikke for nært, ikke for langt unna.",
                "Stå lavt og klar til å reagere."
            ],
            "Under situasjonen": [
                "Hold tett kontakt uten å miste balansen.",
                "Bruk kroppen klokt – vær sterk med skuldre og overkropp, men ikke dytte.",
                "Les motstanderens første touch – gå på hvis den blir for lang.",
                "Ta ut rommet mellom ball og motstander."
            ],
            "Etter situasjonen": [
                "Hvis du vinner ballen, spill den til en trygg medspiller eller før fremover.",
                "Hvis du mister duellen, følg opp og press videre.",
                "Kommuniser med nærmeste lagkamerat."
            ]
        },
        "spille-framover:ballforer": {
            "Før involvering": [
                "Være spillbar – ut av pasningsskygge.",
                "Skaffe seg oversikt over ledig rom/plass.",
                "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanderens mål.",
                "Riktig kroppsstilling og frekvens i beina før mottak."
            ],
            "Under involvering med ball": [
                "Bevisst bruk av førsteberøring (skjerme, medtak).",
                "Korte hurtige touch med begge føtter.",
                "Utnytte rom fremover i banen ved å føre, drible eller «vennlig hilsen»-pasning.",
                "Riktig kroppsstilling og frekvens i beina ved håndtering av ball, føring og dribling."
            ],
            "Etter involvering": [
                "Skaffe seg oversikt over ledig rom/plass for å gjøre seg spillbar."
            ]
        },
        "spille-framover:laget": {
            "Spillbarhet/bevegelse": [
                "Ut av pasningsskyggen – «jeg vil ha ballen».",
                "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
                "Bevegelse for å skape og utnytte overtall sammen med ballfører."
            ],
            "Vinkel/avstand": [
                "Gjøre oss store sammen i bredde og dybde.",
                "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ."
            ]
        },
        "komme-til-avslutning:ballforer": {
            "Bevegelse – lage/utnytte rom": [
                "Utnytte rom fremover i banen – pasning med «vennlig hilsen».",
                "Overtallsspill og kombinasjoner for å spille seg igjennom (eks. veggspill)."
            ],
            "Komme til avslutning i boks": [
                "Bevegelser for å frigjøre seg: «fra – imot», «imot – fra».",
                "Oppsøk 1 mot 1: utfordre – spille/dra seg forbi."
            ],
            Avslutningen: [
                "Først på ball.",
                "Plassering framfor kraft i avslutningen.",
                "Tålmodig – se på keeper, se på ball."
            ]
        },
        "komme-til-avslutning:laget": {
            "Spillbarhet/bevegelse": [
                "Ut av pasningsskyggen – «jeg vil ha ballen».",
                "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål. Klar for retur fra keeper.",
                "Bevegelse for å skape og utnytte overtall sammen med ballfører."
            ],
            "Vinkel/avstand": [
                "Gjøre oss store sammen i bredde og dybde.",
                "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ."
            ]
        },
        "vinne-ball:1f": {
            "Før involvering": [
                "Oversikt over ball, med- og motspillere.",
                "Kommer ballfører i stor eller liten fart, eller har ryggen til?"
            ],
            "Under involvering": [
                "Se på ball, og vurdere ballførers fart og ferdigheter.",
                "Komme tett i press med rett fart og opprettholde presset med riktig kroppsstilling og korte, raske steg.",
                "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning."
            ],
            "Etter involvering": [
                "Skaffe seg oversikt på nytt: er du fortsatt 1F?",
                "Presse på nytt om mulig.",
                "Raskt på «rett side» av ball når pressejobben er over."
            ]
        },
        "vinne-ball:laget": {
            Forflytning: [
                "Reagere hurtig sammen når 1F går for å vinne ball.",
                "Ved balltap: fortest mulig få flest mulig på rett side av ball.",
                "Kontroll på farlige rom ved flest mulig spillere på rett side av ball."
            ],
            Avstand: [
                "Korte avstander mellom spillere i lengden.",
                "Små avstander mellom spillere i bredden.",
                "Jo tettere press, jo kortere avstander.",
                "Ta ansvar for spillere foran oss."
            ]
        },
        "hindre-avslutning:1f": {
            "Posisjonering/press – nekte rom": [
                "Komme seg på rett side mellom ball og eget mål.",
                "Kontroll på farlige rom ved å posisjonere seg for å komme tett eller snappe/takle/vinne ball."
            ],
            "Nekte avslutning": [
                "Komme tett og presse, se på ball.",
                "Offervilje – først på ball.",
                "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning.",
                "Holde feilvendte spillere feilvendt, armlengdes avstand."
            ],
            "Håndtere avslutning": [
                "Keeper er posisjonert og er skuddklar.",
                "Opp i blokk: blokke med fremsiden av kroppen.",
                "Alle i «beredskap» frem til ballen er ute av boksen – jakte returer."
            ]
        },
        "hindre-avslutning:laget": {
            "Posisjonering/press – nekte rom": [
                "Komme seg på rett side mellom ball og eget mål.",
                "Kontroll på farlige rom ved å posisjonere seg for å komme tett eller snappe/takle/vinne ball."
            ],
            "Nekte avslutning": [
                "Komme tett og presse, se på ball.",
                "Offervilje – først på ball.",
                "Stresse ballfører: forsøke å vinne ball eller tvinge frem en upresis pasning.",
                "Holde feilvendte spillere feilvendt, armlengdes avstand."
            ],
            "Håndtere avslutning": [
                "Keeper er posisjonert og er skuddklar.",
                "Opp i blokk: blokke med fremsiden av kroppen.",
                "Alle i «beredskap» frem til ballen er ute av boksen – jakte returer."
            ]
        }
    },
    "10-12": {
        mottak: {
            "Før medtak/mottak": [
                "Velg riktig vinkel og avstand til pasningslegger.",
                "Frigjør deg fra markering med fra-imot-bevegelse eller tempoendring.",
                "Halvåpen kroppsstilling for å se både ball og neste trekk.",
                "Orienter deg for å vite om du er under press."
            ],
            "Under medtak/mottak": [
                "Sjekk rommet på nytt mens ballen er på vei.",
                "Bruk kroppen til å skjerme ballen.",
                "Tilpass touchens lengde til situasjonen (kort ved press, lengre i åpent rom)."
            ],
            "Etter medtak/mottak": [
                "Blikk opp umiddelbart for å spille, drible eller skyte.",
                "Fortsett å skjerme ballen om presset kommer."
            ]
        },
        dribling: {
            "Før driblingen": [
                "Les situasjonen og vurder rom, motstandere og medspillere.",
                "Bestem om du skal drible rett inn i et ledig rom eller om du må utfordre direkte mot en forsvarsspiller for å trekke på deg press først."
            ],
            "Under driblingen": [
                "Kombiner blikk opp med kontroll på ballen.",
                "Utfør finten med store, troverdige bevegelser og tempo for å passere.",
                "Skjerm ballen med kroppen og bruk riktig fot for situasjonen."
            ],
            "Etter driblingen": [
                "Skap avstand etter passering.",
                "Velg raskt neste handling (pasning, skudd, videre føring).",
                "Fortsett å beskytte ballen hvis presset fortsetter."
            ]
        },
        vending: {
            "Før vending": [
                "Orienter deg tidlig for å se medspillere, motspillere og rom.",
                "Velg vendingsmetode (innside, utside, såle, med finte)."
            ],
            "Under vending": [
                "Utfør vending med riktig fotdel i forhold til press og rom.",
                "Bruk tempoendring eller finte for å riste av deg motstander.",
                "Skjerm ballen med kroppen under vending."
            ],
            "Etter vending": [
                "Akselerer i ny retning for å utnytte rommet.",
                "Løft blikket og velg neste handling (pasning, skudd, ny dribling)."
            ]
        },
        pasning: {
            "Før pasning": [
                "Se først etter pasningsalternativer fremover i banen før du ser etter alternativer sideveis eller bakover.",
                "Vurder medspillerens bevegelse og rommet rundt."
            ],
            "Under pasning": [
                "Kombiner blikk opp med presist tilslag.",
                "Tilpass kraft og retning etter situasjonen."
            ],
            "Etter pasning": [
                "Les spillet videre og posisjoner deg for neste trekk.",
                "Omstill raskt til forsvar om pasningen brytes."
            ]
        },
        foring: {
            "Før føringen": [
                "Les rommet foran deg og rundt deg.",
                "Velg retning, tempo og plan for neste trekk."
            ],
            "Under føringen": [
                "Tilpass touchlengde til tempo og press.",
                "Veksle fot og fotdel for å beskytte ballen.",
                "Bruk kroppen for å skjerme mot press."
            ],
            "Etter føringen": [
                "Velg neste handling raskt (pasning, dribling, skudd).",
                "Omstill raskt til forsvar om du mister ballen."
            ]
        },
        skudd: {
            "Før skudd": [
                "Vurder avstand, vinkel og keeperens posisjon.",
                "Velg skuddtype (bredside, vrist, volley, halvsprett).",
                "Juster kroppsstilling og balanse for presist tilslag."
            ],
            "Under skudd": [
                "Kombiner blikk opp før skudd med fokus på ball i tilslaget.",
                "Treffpunkt på ballen: midt for rett skudd, under for å løfte, siden for skru.",
                "Følg gjennom med foten i retning av skuddet."
            ],
            "Etter skudd": [
                "Vær klar for returer og nye muligheter.",
                "Omstill raskt til forsvar om motstander får kontroll."
            ]
        },
        heading: {
            "Før heading": [
                "Les ballbanen tidlig for å velge posisjon.",
                "Bruk korte forberedende steg og senk tyngdepunktet for å gjøre klar til å ta sats.",
                "Velg intensjon (klarere, avslutte, legge igjen)."
            ],
            "Under heading": [
                "Bruk trestegssats om nødvendig for å hoppe høyt.",
                "Møt ballen på høyeste punkt.",
                "Stuss med toppen av hodet eller styr ballen i ønsket retning med panna.",
                "Bruk hele overkroppen for å få kraft."
            ],
            "Etter heading": [
                "Land kontrollert og forberedt på neste situasjon.",
                "Vær klar til å vinne andreball eller gå i ny posisjon."
            ]
        },
        press: {
            "Før press/takling": [
                "Les situasjonen: se ballførerens retning og lagets balanse. Er laget i ubalanse, prioriter å ikke bli driblet. Er laget i balanse, gå for å vinne ballen.",
                "Velg pressretning (lede innover/utover).",
                "Beregn avstand og tidspunkt for press."
            ],
            "Under press/takling": [
                "Kombiner sidevendt kroppsstilling med lavt tyngdepunkt.",
                "Bruk armer til balanse og romfølelse uten å lage frispark.",
                "Hold blikket på ballen, ikke på finter.",
                "Takle når ballen er litt for langt fra foten til ballføreren."
            ],
            "Etter press/takling": [
                "Sikre ballen etter takling (pasning eller føring).",
                "Reis deg raskt om du faller.",
                "Finn ny posisjon om ballen spilles videre."
            ]
        },
        klarering: {
            "Før klarering": [
                "Orienter deg tidlig – vurder hvor ballen havner og hvor du bør stå.",
                "Juster posisjonen og fotarbeidet for god timing.",
                "Bruk armene aktivt for å holde motstandere unna."
            ],
            "Under klarering": [
                "Stå skrått i forhold til ballbanen – magen delvis mot motstanderens mål, delvis mot sidelinje.",
                "Bruk foten nærmest ballen, og treff midt på for kraft og høyde.",
                "Prioriter sikkerhet – klarer bort først, så spill."
            ],
            "Etter klarering": [
                "Push laget ut.",
                "Orienter deg og se etter neste situasjon.",
                "Ta ordet – reorganiser og gi beskjed om posisjoner."
            ]
        },
        "kampen-om-ballen": {
            "Før situasjonen": [
                "Orienter deg tidlig – vurder hvor ballen havner og om du kan nå den først.",
                "Juster farten slik at du ankommer situasjonen med balanse.",
                "Bruk armene til å holde avstand og stabilitet."
            ],
            "Under situasjonen": [
                "Oppretthold tett kontakt – ikke la motstanderen snu opp.",
                "Finn riktig balanse – lavt tyngdepunkt, aktiv overkropp.",
                "Les motstanderens touch og utnytt det første dårlige touchet.",
                "Ta ut rommet mellom ball og motstander."
            ],
            "Etter situasjonen": [
                "Reager raskt – enten sikre ballen eller fortsett presset.",
                "Juster posisjon og hjelp laget å samle seg bak ballen.",
                "Kommuniser tydelig – hvem presser, hvem sikrer."
            ]
        },
        "spille-framover:ballforer": {
            "Før involvering": [
                "Være spillbar – ut av pasningsskyggen.",
                "Orientert om ledige rom fjernt og nært.",
                "Spillbar gjennom riktig avstand og vinkel til ballfører.",
                "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
                "Riktig kroppsstilling og frekvens i beina ved forflytninger før mottak."
            ],
            "Under involvering med ball": [
                "Ro (med ball), åpne (i førstetouch) og true (med blikk og fot).",
                "Utnytte rom fremover i banen ved å føre, drible eller pasning.",
                "Korte hurtige touch med begge føtter for å utnytte rom / skape overtall med føring.",
                "Skape nye rom gjennom pasninger med riktig fart på ball til riktig fot.",
                "Tenke mønstre som «opp – tilbake – igjennom» og «fra trangt – til ledig».",
                "Riktig kroppsstilling og frekvens i beina ved håndtering av ball, føring og dribling."
            ],
            "Etter involvering": [
                "Hurtig få ny oversikt etter pasning.",
                "Ny aksjon umiddelbart for å gjøre seg spillbar og / eller lage rom.",
                "Være forberedt på å stille om fra angrep til forsvar."
            ]
        },
        "spille-framover:laget": {
            "Spillbarhet/bevegelse": [
                "Bevegelse bak ballfører for å støtte / vende spill.",
                "Bevegelse forbi upresset ballfører for å skape spillpunkter.",
                "Bevegelse av spillere foran – true ulike rom samtidig.",
                "Bevegelse for å skape og utnytte overtall sammen med ballfører.",
                "True flere rom samtidig med bevegelse og posisjon."
            ],
            "Vinkel/avstand": [
                "Posisjon og kroppsstilling som gjør at man ser både ballen og motstanders mål.",
                "Gjøre oss store sammen i bredde og dybde.",
                "Gode avstander mellom spillere i ledd og mellom ledd.",
                "Bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ.",
                "Angripe hurtig fremover. Søke å spille kontrollert inn i (1) bakrom, (2) mellomrom sentralt eller (3) rettvendt i sidekorridor.",
                "Beholde oversikt med ball i beina og kunne ombestemme valg.",
                "Hurtige pasningsvalg eller føre ball i stor fart for å utnytte rom med korte hurtige touch og oversikt.",
                "Utnytte ubalanse gjennom føring i fart, utfordre på, «ta kommandoen».",
                "Oversikt og ballkontroll i små rom / under press for å spille fremover eller vende spill.",
                "Opprettholde eller forsterke ubalanse gjennom temposkifte når vi er i prioritert rom.",
                "Ny aksjon umiddelbart for å gjøre seg spillbar på nytt og / eller skape rom."
            ]
        },
        "komme-til-avslutning:ballforer": {
            "Komme til avslutning i boks": [
                "Bevegelser for å komme først på ballen: sprint, stå i ro, «fra – imot», «imot – fra».",
                "Se med- og motspillere – utnytt rom i forsvarende lag.",
                "Posisjonere seg på «blindside».",
                "Pasning igjennom med «vennlig hilsen» (på rett fot til rett tid med rett kraft).",
                "Korte tette touch for å utfordre, spille eller dra seg forbi. På jakt etter skuddmuligheter."
            ],
            Avslutningen: [
                "Tålmodig – holde avslutningsrom åpent.",
                "Plassering framfor kraft i avslutningen.",
                "Kort tid mellom nest siste touch og avslutning.",
                "Se på keeper, så på ball.",
                "Avslutte hurtig når det er trangt (dårlig sikt for keeper, ball kan skifte retning)."
            ],
            "Innlegg og «45»: innlegget/siste pasning": [
                "Oversikt over trusler 1. stolpe, bakre stolpe og «45» og utnytte farligste rom til rett tid.",
                "Tidlige innlegg – slå på «ryggsiden» av førsteforsvarer.",
                "Slå innlegg i rom som angripes (ofte forbi første forsvarsspiller i boks).",
                "Beholde oversikt med ball i beina, finne rett timing og kunne kamuflere valg."
            ],
            "Innlegg og «45»: avslutningen": [
                "Først på ball!",
                "Skudd/heading tilbake i det hjørnet ballen kom fra er ofte lurt."
            ]
        },
        "komme-til-avslutning:laget": {
            "Bevegelse – lage/utnytte rom": [
                "Trusler inn i bakrom.",
                "Søke å spille igjennom før rundt.",
                "Samtidige, truende og eksplosive bevegelser.",
                "Benytte veggspill og kombinasjoner for å spille seg igjennom.",
                "Riktig kroppsstilling og frekvens i beina i utgangsposisjoner og ved forflytninger."
            ],
            "Komme til avslutning i boks": [
                "Bevegelser for å komme først på ballen: sprint, stå i ro, «fra – imot», «imot – fra».",
                "Se med- og motspillere – utnytt rom i forsvarende lag.",
                "Posisjonere seg på «blindside»."
            ],
            "Innlegg og «45»: spillbarhet/bevegelse": [
                "Samtidige, truende og eksplosive bevegelser. True ulike rom.",
                "True 1. stolpe, bakre stolpe og «45».",
                "Timing = lese ballførers blikk og touch.",
                "Flest mulig trusler innenfor stengene.",
                "Tålmodig – holde avslutningsrom åpent.",
                "Plassere seg i blindsiden til motstander."
            ]
        },
        "vinne-ball:1f": {
            "Før involvering": [
                "Oversikt over ball, med- og motspillere.",
                "Vurdere om vi er «i press» eller «kontrollerer rom».",
                "Velge pressøyeblikk ut ifra avstand, motstanders kroppsposisjon, blikk, fot og touch.",
                "Kroppskontroll – kontroll på overkroppen i utgangsposisjoner for raskt å kunne gå i alle retninger."
            ],
            "Under involvering": [
                "Komme tett i press med rett fart og opprettholde presset med riktig kroppsstilling og høy frekvens i beina.",
                "Bevisst på rom rundt seg for å stenge avspillpunkter.",
                "Kroppskontroll og fart i beina – kontroll på overkroppen ved forflytninger. Aktiv armbruk ved duellspill og kroppskontakt.",
                "Tett i ballfører for å vinne ball eller tvinge frem en upresis pasning.",
                "Utnytte dårlige, lange og for mange touch."
            ],
            "Etter involvering": [
                "Skaffe seg oversikt på nytt, er du fortsatt 1F?",
                "Presse på nytt om mulig.",
                "Raskt på «rett side» av ball når pressejobben er over."
            ]
        },
        "vinne-ball:laget": {
            Forflytning: [
                "Posisjonering i forhold til ball og medspillere, ikke motspillere – soneforsvar.",
                "Ved balltap: gjenvinning eller fortest mulig få flest mulig på rett side av ball.",
                "Reagere hurtig og samlet på definerte pressignaler som støttepasning, dårlig touch, feilvendte spillere, ball til back.",
                "Kontinuerlig justering av høyde i forhold til ballfører, lese fot, blikk, kroppsposisjon og trusler.",
                "Senke oss samlet og ha kontroll på farlige rom dersom vi mister ball / ikke har press på ballføreren."
            ],
            Avstand: [
                "Hurtig komme til definerte utgangsposisjoner, med rett kroppsstilling for å ha kontroll på rom og klare for å presse.",
                "Korte avstander mellom spillere i lengden og bredden.",
                "Jo tettere press, jo kortere avstander.",
                "Pressansvar for spillere foran oss i hver vår sone når vi presser høyt."
            ]
        },
        "hindre-avslutning:1f": {
            "Hindre avslutning": [
                "Komme tett og presse – se på ball.",
                "Kontroll på overkropp og alltid en fot i bakken – korte ned stegene inn i press.",
                "Stresse ballfører; forsøke å vinne ball, oppholde og / eller lede vekk fra mål.",
                "Ta rommet mellom ballfører og ball før man tar ball.",
                "Hold feilvendte spillere feilvendt – armlengdes avstand."
            ],
            "Håndtere avslutning": [
                "Keeper er posisjonert og er skuddklar.",
                "Opp i blokk, blokke med fremsiden av kroppen.",
                "Stenge av ett hjørne – keeper tar det andre (aldri skudd mellom beina)."
            ],
            "Innlegg og «45»: posisjonering/press – nekte rom": [
                "Blokkere eller hindre innlegg/pasning.",
                "Tvinge eventuelt innlegg foran spiller i press.",
                "Sidestilt kroppsstilling så man ser ball og motstandere.",
                "Hurtig i posisjon mellom eget mål og motstander.",
                "Ta kontroll foran eget mål gjennom posisjonering innenfor stolpene.",
                "Spillere på feil side skal komme seg på rett side."
            ],
            "Innlegg og «45»: hindre avslutning": [
                "Oversikt over trusler mot 1. stolpe, bakre stolpe og «45» og kontroll på farligste rom.",
                "Posisjon mellom motstander og mål.",
                "Offervilje – først på ball.",
                "«Ta duellen før duellen» – gå i kropp for å ta bort timing og fart hos motspiller."
            ],
            "Innlegg og «45»: håndtere avslutning": [
                "Tverrvende og inn i press på nytt bakfra hvis mulig.",
                "«På plass» igjen når pressejobben er ferdig.",
                "Komme på rett side igjen hvis man er passert og utenfor presseavstand.",
                "Være mentalt forberedt på å omstille fra forsvar til angrep."
            ]
        },
        "hindre-avslutning:laget": {
            "Hindre avslutning": [
                "Sidestilt kroppsstilling så man ser ball og motstandere.",
                "Hurtig i posisjon mellom eget mål og motstander.",
                "Ta kontroll foran eget mål gjennom posisjonering innenfor stolpene.",
                "Spillere på feil side skal komme seg på rett side.",
                "Hold feilvendte spillere feilvendt – armlengdes avstand."
            ],
            "Håndtere avslutning": [
                "Keeper er posisjonert og er skuddklar.",
                "Opp i blokk, blokke med fremsiden av kroppen.",
                "Stenge av ett hjørne – keeper tar det andre (aldri skudd mellom beina).",
                "Alle i «beredskap» frem til ballen er ute av boksen.",
                "Spillere som ikke har markering/blokker – beskytt målet."
            ],
            "Innlegg og «45»: hindre avslutning": [
                "Blokkere eller hindre innlegg/pasning.",
                "Oversikt over trusler mot 1. stolpe, bakre stolpe og «45» og kontroll på farligste rom.",
                "Offervilje – først på ball.",
                "«Ta duellen før duellen» – gå i kropp for å ta bort timing og fart hos motspiller.",
                "Markere og ha kontroll på farlige rom helt til situasjonen er avklart. Når motstander ikke når ball, ta dem likevel ut for å skaffe rom til keeper."
            ]
        }
    }
};
const LEARNING_POINTS = BAND_KEYS.flatMap((band)=>Object.entries(LP[band]).flatMap(([key, groups])=>{
        const [topic, role = null] = key.split(":");
        let n = 0;
        return Object.entries(groups).flatMap(([group, texts])=>texts.map((text)=>({
                    id: `lm.${band}.${topic}${role ? `.${role}` : ""}.${++n}`,
                    band,
                    topic,
                    role,
                    group,
                    text
                })));
    }));
const BY_ID = new Map(LEARNING_POINTS.map((p)=>[
        p.id,
        p
    ]));
const temaTag = (key)=>`tema.${key}`;
const delfTag = (key)=>`delf.${key}`;
function learningPoint(id) {
    return BY_ID.get(id);
}
function tagLabel(tag) {
    if (tag.startsWith("tema.")) return HOVEDTEMA.find((t)=>temaTag(t.key) === tag)?.label;
    if (tag.startsWith("delf.")) return DELFERDIGHETER.find((t)=>delfTag(t.key) === tag)?.label;
    return BY_ID.get(tag)?.text;
}
const isKnownTag = (tag)=>tagLabel(tag) !== undefined;
const aktivitetLabel = (key)=>AKTIVITETER.find((a)=>a.key === key)?.label;
function matchHovedtema(theme, band) {
    const norm = (x)=>x.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/fremover/g, "framover").replace(/\s+/g, " ").trim();
    const t = norm(theme);
    if (!t) return undefined;
    const inBand = HOVEDTEMA.filter((h)=>h.bands.includes(band));
    return inBand.find((h)=>norm(h.label) === t) ?? inBand.find((h)=>norm(h.label).startsWith(t) || t.startsWith(norm(h.label).split(" ").slice(0, 3).join(" ")));
}
function nffSummary(e) {
    const temaer = e.nff_tags.filter((t)=>t.startsWith("tema.")).map(tagLabel).filter(Boolean);
    return [
        e.bands.length ? `${e.bands.map((b)=>b.replace("-", "–")).join(", ")} år` : "",
        aktivitetLabel(e.nff_activity) ?? "",
        ...temaer
    ].filter(Boolean).join(" · ");
}
}),
"[project]/lib/plans/bank-proposals.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GAP_MIN",
    ()=>GAP_MIN,
    "METADATA_FIELDS",
    ()=>METADATA_FIELDS,
    "bankGaps",
    ()=>bankGaps,
    "bankOverlaps",
    ()=>bankOverlaps,
    "emptyValues",
    ()=>emptyValues,
    "fillMissing",
    ()=>fillMissing,
    "gapCode",
    ()=>gapCode,
    "gapReason",
    ()=>gapReason,
    "gapValues",
    ()=>gapValues,
    "gapWish",
    ()=>gapWish,
    "metadataReason",
    ()=>metadataReason,
    "metadataWish",
    ()=>metadataWish,
    "missingFields",
    ()=>missingFields,
    "overlapReason",
    ()=>overlapReason
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/fagplan.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/feedback.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/exercise-edits.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/observations.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/plan.ts [instrumentation] (ecmascript)");
;
;
;
;
;
const GAP_MIN = 3;
/** Gaps are only trusted when the bank is mostly tagged with main themes: otherwise the missing tags come first. */ const GAP_MIN_BANK = 10;
const GAP_TAGGED_SHARE = 0.6;
/** Rated below this (weighted), an exercise does not count as a good one. */ const GOOD_SCORE = 1.8;
const scoreOf = (patterns, code)=>patterns.get(code)?.score ?? null;
const live = (b)=>b.status !== "archived";
function bankGaps(bank, patterns, bands) {
    const active = bank.filter((b)=>b.status === "active");
    const tagged = active.filter((b)=>b.nff_tags.some((t)=>t.startsWith("tema.")));
    if (active.length < GAP_MIN_BANK || tagged.length < active.length * GAP_TAGGED_SHARE) return [];
    const by = new Map(patterns.map((p)=>[
            p.code,
            p
        ]));
    const good = (b)=>live(b) && (scoreOf(by, b.code) ?? GOOD_SCORE) >= GOOD_SCORE;
    const out = [];
    for (const band of [
        ...new Set(bands)
    ])for (const tema of __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["HOVEDTEMA"].filter((t)=>t.bands.includes(band))){
        const have = bank.filter((b)=>good(b) && b.nff_tags.includes((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["temaTag"])(tema.key)) && (!b.bands.length || b.bands.includes(band))).length;
        if (have < GAP_MIN) out.push({
            band,
            tema,
            have
        });
    }
    return out.sort((a, b)=>a.have - b.have);
}
const gapCode = (g)=>`ny-${g.band}-${g.tema.key}`;
function gapReason(g) {
    const have = g.have === 0 ? "ingen gode øvelser" : `bare ${g.have} ${g.have === 1 ? "god øvelse" : "gode øvelser"}`;
    return `Banken har ${have} for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(g.band)} med hovedtemaet «${g.tema.label}». Lag med ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(g.band)} bruker appen, så KI foreslår en ny.`;
}
function gapWish(g, names) {
    const known = names.length ? ` Banken har allerede ${names.slice(0, 5).map((n)=>`«${n}»`).join(", ")} for temaet, så lag noe tydelig annerledes.` : "";
    return `Lag en ny øvelse for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(g.band)} (NFF-båndet) med hovedtemaet «${g.tema.label}», slik fagplanen beskriver det.${known}`.slice(0, 1000);
}
function gapValues(e, extra, g, category, drawing) {
    const n = (x)=>x === null ? "" : String(x);
    const lines = (x)=>x.join("\n");
    return {
        name: e.navn.slice(0, 80),
        category,
        themes: g.tema.label,
        min_players: n(extra.min_players),
        max_players: n(extra.max_players),
        duration_minutes: n(extra.duration_minutes),
        area: extra.area,
        organisation: lines(e.organisering),
        execution: lines(e.gjennomforing),
        learning_points: lines(e.laeringsmomenter),
        questions: lines(e.sporsmal),
        easier: e.enklere,
        harder: e.vanskeligere,
        nff_url: e.nff_url,
        drawing,
        // Like «Ny øvelse med KI»: a candidate until it has been used.
        status: "candidate",
        bands: [
            g.band
        ],
        nff_activity: e.aktivitet ?? "",
        nff_tags: [
            ...new Set([
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["temaTag"])(g.tema.key),
                ...e.nff_tags ?? []
            ])
        ]
    };
}
function emptyValues() {
    return {
        name: "",
        category: "",
        themes: "",
        min_players: "",
        max_players: "",
        duration_minutes: "",
        area: "",
        organisation: "",
        execution: "",
        learning_points: "",
        questions: "",
        easier: "",
        harder: "",
        nff_url: "",
        drawing: "",
        status: "",
        bands: [],
        nff_activity: "",
        nff_tags: []
    };
}
/** Variants are meant to be like what they are based on. */ const related = (a, b)=>a.based_on === b.code || b.based_on === a.code || !!a.based_on && a.based_on === b.based_on;
function bankOverlaps(bank, patterns) {
    const by = new Map(patterns.map((p)=>[
            p.code,
            p
        ]));
    const rank = (b)=>[
            scoreOf(by, b.code) ?? -1,
            by.get(b.code)?.ratings ?? 0,
            -b.id
        ];
    const better = (a, b)=>{
        const [x, y] = [
            rank(a),
            rank(b)
        ];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    };
    const list = bank.filter(live).sort((a, b)=>a.id - b.id);
    const found = [];
    for(let i = 0; i < list.length; i++){
        const a = list[i];
        const rest = list.slice(i + 1).filter((b)=>!related(a, b));
        const top = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["similarExercises"])({
            ...a,
            drawing: a.drawing ?? null
        }, rest)[0];
        if (!top || top.score < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["TOO_SIMILAR"]) continue;
        const b = rest.find((x)=>x.code === top.code);
        const [weaker, stronger] = better(a, b) >= 0 ? [
            b,
            a
        ] : [
            a,
            b
        ];
        found.push({
            weaker,
            stronger,
            score: top.score
        });
    }
    const used = new Set();
    return found.sort((a, b)=>b.score - a.score).filter((o)=>{
        if (used.has(o.weaker.code) || used.has(o.stronger.code)) return false;
        used.add(o.weaker.code).add(o.stronger.code);
        return true;
    });
}
function overlapReason(o, patterns) {
    const by = new Map(patterns.map((p)=>[
            p.code,
            p
        ]));
    const rated = (b)=>{
        const p = by.get(b.code);
        return p?.score != null && p.ratings ? `snitt ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["meanText"])(p.score)} av 3 fra ${p.ratings} vurderinger` : "ikke vurdert";
    };
    return `Øvelsen er ${Math.round(o.score * 100)} % lik «${o.stronger.name}». «${o.stronger.name}» er ${rated(o.stronger)}, denne er ${rated(o.weaker)}. To nesten like øvelser gjør banken vanskeligere å bruke, så forslaget er å arkivere denne. De slås ikke sammen.`;
}
const METADATA_FIELDS = [
    "min_players",
    "max_players",
    "duration_minutes",
    "area",
    "nff_activity",
    "nff_tags",
    "bands"
];
function missingFields(v) {
    return METADATA_FIELDS.filter((k)=>k === "nff_tags" ? !v.nff_tags.some((t)=>t.startsWith("tema.")) : k === "bands" ? !v.bands.length : !String(v[k]).trim());
}
function fillMissing(base, ki, missing, pattern) {
    const out = {
        ...base
    };
    for (const k of missing){
        if (k === "bands") out.bands = (pattern?.bands ?? []).filter((b)=>b.ratings >= 3 && b.mean >= 2).map((b)=>b.band);
        else if (k === "nff_tags") out.nff_tags = [
            ...new Set([
                ...base.nff_tags,
                ...ki.nff_tags
            ])
        ];
        else out[k] = ki[k];
    }
    // Keep the players in order when only one end was missing.
    if (out.min_players && out.max_players && Number(out.max_players) < Number(out.min_players)) {
        if (missing.includes("max_players")) out.max_players = out.min_players;
        else out.min_players = out.max_players;
    }
    return out;
}
/** «min. spillere», but «NFF-tagger». */ const fieldName = (k)=>k === "nff_tags" ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["EDIT_FIELDS"][k] : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["EDIT_FIELDS"][k].toLowerCase();
function metadataReason(missing) {
    return `Øvelsen mangler ${missing.map(fieldName).join(", ")}. Med dem finner KI og trenerne den lettere for riktig alder og gruppestørrelse. Forslaget fyller bare inn det som mangler.`;
}
function metadataWish(missing) {
    return `Fyll inn det øvelsen mangler: ${missing.filter((k)=>k !== "bands").map(fieldName).join(", ")}. Hovedtema og aktivitet skal følge NFF-fagplanen. Behold resten av øvelsen som den er.`;
}
}),
"[project]/lib/plans/drawing.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pitch drawings from coordinates (port of the old app's fct_drawing.R).
 *
 * A drawing (tegning) is JSON with 1–3 sketches side by side. Coordinates are
 * in metres: x from 0 to `bredde` (left to right), y from 0 to `lengde`
 * (bottom to top). Outside the field, up to `marg` metres, is grass for
 * titles and captions. A model never writes drawing code: the app checks
 * the JSON, moves what can be moved safely (`fixDrawing`), and renders it
 * (`drawingShapes`) to SVG in the browser and in the PDF.
 */ __turbopack_context__.s([
    "COLOURS",
    ()=>COLOURS,
    "DRAWING_MAX_CHARS",
    ()=>DRAWING_MAX_CHARS,
    "DrawingError",
    ()=>DrawingError,
    "EXAMPLE_DRAWING",
    ()=>EXAMPLE_DRAWING,
    "arrowPath",
    ()=>arrowPath,
    "checkDrawing",
    ()=>checkDrawing,
    "compactDrawing",
    ()=>compactDrawing,
    "drawingShapes",
    ()=>drawingShapes,
    "fixDrawing",
    ()=>fixDrawing,
    "layout",
    ()=>layout,
    "parseDrawing",
    ()=>parseDrawing,
    "prettyDrawing",
    ()=>prettyDrawing,
    "px",
    ()=>px,
    "sizes",
    ()=>sizes,
    "validateDrawing",
    ()=>validateDrawing,
    "wrap",
    ()=>wrap
]);
class DrawingError extends Error {
}
const COLOURS = {
    grass: [
        "#56a644",
        "#4c9a3a"
    ],
    line: "#FFFFFF",
    team: {
        "1": "#1f5fbf",
        "2": "#d63a2f",
        joker: "#f2b600"
    },
    teamText: {
        "1": "#FFFFFF",
        "2": "#FFFFFF",
        joker: "#121212"
    },
    trainer: "#2b2b2b",
    cone: {
        oransje: "#ff8c1a",
        gul: "#f5c518"
    },
    helper: "#f5d63d",
    labelFill: "#1d4a1d",
    shadow: "rgba(0,0,0,0.33)"
};
const OBJECT_TYPES = [
    "spiller",
    "trener",
    "ball",
    "kjegle",
    "maal",
    "smaamaal"
];
const ARROW_TYPES = [
    "pasning",
    "lop",
    "foring"
];
const GOAL_SIDES = [
    "venstre",
    "hoyre",
    "topp",
    "bunn"
];
const DRAWING_MAX_CHARS = 20000;
const MAX_ITEMS = {
    objekter: 40,
    piler: 20,
    soner: 10,
    linjer: 20,
    hjelpelinjer: 10,
    etiketter: 15,
    tekster: 15
};
const txt = (x)=>x === null || x === undefined ? "" : String(x).trim();
function num(v, what, lo = -Infinity, hi = Infinity) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < lo || n > hi) {
        throw new DrawingError(`${what} må være et tall${Number.isFinite(lo) ? ` fra ${lo} til ${hi}` : ""}.`);
    }
    return n;
}
function text(v, what, max) {
    const t = txt(v);
    if (t.length > max) throw new DrawingError(`${what} kan ha maks ${max} tegn.`);
    return t;
}
function parseDrawing(x) {
    if (x === null || x === undefined) return null;
    if (typeof x !== "string") return x;
    const s = x.trim();
    if (!s) return null;
    if (s.length > DRAWING_MAX_CHARS) throw new DrawingError(`Tegningen er for stor (maks ${DRAWING_MAX_CHARS} tegn).`);
    try {
        return JSON.parse(s);
    } catch  {
        throw new DrawingError("Tegningen er ikke gyldig JSON. Sjekk komma, klammer og anførselstegn.");
    }
}
function validateDrawing(input) {
    const d = parseDrawing(input);
    if (d === null) return null;
    const sk = d && typeof d === "object" ? d.skisser : undefined;
    if (!Array.isArray(sk) || sk.length < 1 || sk.length > 3) throw new DrawingError("En tegning må ha 1 til 3 skisser.");
    return {
        skisser: sk.map((raw, i)=>{
            const s = raw ?? {};
            const w = `Skisse ${i + 1}: `;
            for (const [k, max] of Object.entries(MAX_ITEMS)){
                if (Array.isArray(s[k]) && s[k].length > max) throw new DrawingError(`${w}Maks ${max} ${k} per skisse.`);
            }
            const b = s.bane ?? {};
            const bane = {
                bredde: num(b.bredde, `${w}Banens bredde`, 4, 120),
                lengde: num(b.lengde, `${w}Banens lengde`, 4, 120),
                marg: b.marg === undefined || b.marg === null ? 2.5 : num(b.marg, `${w}Margen`, 0.5, 10),
                midtlinje: b.midtlinje === true
            };
            const inside = (x, y, what)=>{
                if (x < -bane.marg || x > bane.bredde + bane.marg || y < -bane.marg || y > bane.lengde + bane.marg) {
                    throw new DrawingError(`${w}${what} ligger utenfor tegningen.`);
                }
            };
            const pt = (p, what)=>{
                if (!Array.isArray(p) || p.length !== 2) throw new DrawingError(`${w}${what} må være et punkt [x, y].`);
                const v = [
                    num(p[0], `${w}${what}`),
                    num(p[1], `${w}${what}`)
                ];
                inside(v[0], v[1], what);
                return v;
            };
            const list = (k)=>Array.isArray(s[k]) ? s[k] : [];
            const objekter = list("objekter").map((o)=>{
                const type = txt(o.type);
                if (!OBJECT_TYPES.includes(type)) throw new DrawingError(`${w}Ukjent objekttype «${txt(o.type)}».`);
                const x = num(o.x, `${w}${type} x`);
                const y = num(o.y, `${w}${type} y`);
                inside(x, y, type);
                const r = {
                    type,
                    x,
                    y
                };
                if (type === "spiller") {
                    const lag = txt(o.lag ?? "1");
                    if (![
                        "1",
                        "2",
                        "joker"
                    ].includes(lag)) throw new DrawingError(`${w}Lag må være 1, 2 eller joker.`);
                    r.lag = lag;
                }
                if (type === "spiller" || type === "trener") {
                    r.tekst = text(o.tekst ?? (type === "trener" ? "T" : ""), `${w}Teksten på en spiller`, 3);
                }
                if (type === "kjegle") {
                    const f = txt(o.farge ?? "oransje");
                    if (f !== "oransje" && f !== "gul") throw new DrawingError(`${w}Kjeglefarge må være oransje eller gul.`);
                    r.farge = f;
                }
                if (type === "maal" || type === "smaamaal") {
                    r.bredde = num(o.bredde ?? (type === "maal" ? 5 : 2), `${w}Målets bredde`, 0.5, 8);
                    const side = txt(o.side ?? "venstre");
                    if (!GOAL_SIDES.includes(side)) throw new DrawingError(`${w}Målets side må være venstre, hoyre, topp eller bunn.`);
                    r.side = side;
                }
                return r;
            });
            const piler = list("piler").map((a)=>{
                const type = txt(a.type);
                if (!ARROW_TYPES.includes(type)) throw new DrawingError(`${w}Ukjent piltype «${txt(a.type)}».`);
                return {
                    type,
                    fra: pt(a.fra, "Pilens start"),
                    til: pt(a.til, "Pilens slutt"),
                    bue: a.bue === undefined || a.bue === null ? 0 : num(a.bue, `${w}Bue`, -1, 1)
                };
            });
            const soner = list("soner").map((z)=>{
                const r = {
                    x: num(z.x, `${w}Sone x`),
                    y: num(z.y, `${w}Sone y`),
                    b: num(z.b, `${w}Sonens bredde`, 0.5, 120),
                    h: num(z.h, `${w}Sonens høyde`, 0.5, 120),
                    tekst: text(z.tekst, `${w}Sonetekst`, 40)
                };
                inside(r.x, r.y, "Sonen");
                inside(r.x + r.b, r.y + r.h, "Sonen");
                return r;
            });
            const linjer = list("linjer").map((l)=>({
                    fra: pt(l.fra, "Linjens start"),
                    til: pt(l.til, "Linjens slutt")
                }));
            const hjelpelinjer = list("hjelpelinjer").map((l)=>({
                    fra: pt(l.fra, "Hjelpelinjens start"),
                    til: pt(l.til, "Hjelpelinjens slutt"),
                    tekst: text(l.tekst, `${w}Hjelpelinjens tekst`, 40)
                }));
            const label = (k, what)=>list(k).map((l)=>{
                    const x = num(l.x, `${w}${what} x`);
                    const y = num(l.y, `${w}${what} y`);
                    inside(x, y, what);
                    return {
                        x,
                        y,
                        tekst: text(l.tekst, `${w}${what}`, 60)
                    };
                });
            return {
                tittel: text(s.tittel, `${w}Tittelen`, 50),
                bane,
                soner,
                linjer,
                hjelpelinjer,
                objekter,
                piler,
                etiketter: label("etiketter", "Etiketten"),
                tekster: label("tekster", "Teksten")
            };
        })
    };
}
function sizes(widthPx, scale) {
    const r = Math.min(Math.max(0.85 * scale, 0.018 * widthPx), 0.04 * widthPx);
    const u = r / 0.024;
    return {
        playerR: r,
        ballR: 0.0085 * u,
        cone: 0.022 * u,
        arrow: 0.0042 * u * 1.33,
        head: 0.016 * u,
        line: 0.0022 * u * 1.33,
        font: 0.021 * u,
        gap: 0.004 * u
    };
}
function layout(d, widthPx = 1800) {
    const wm = d.skisser.map((s)=>s.bane.bredde + 2 * s.bane.marg);
    const hm = d.skisser.map((s)=>s.bane.lengde + 2 * s.bane.marg);
    const scale = widthPx / wm.reduce((a, b)=>a + b, 0);
    const height = Math.round(Math.max(...hm) * scale);
    const x0 = wm.map((_, i)=>wm.slice(0, i).reduce((a, b)=>a + b, 0) * scale);
    const y0 = hm.map((h)=>(height - h * scale) / 2);
    return {
        width: widthPx,
        height,
        scale,
        sizes: sizes(widthPx, scale),
        x0,
        y0
    };
}
function px(lay, s, i, x, y) {
    return [
        lay.x0[i] + (x + s.bane.marg) * lay.scale,
        lay.height - (lay.y0[i] + (y + s.bane.marg) * lay.scale)
    ];
}
const people = (s)=>s.objekter.map((o, i)=>({
            o,
            i
        })).filter(({ o })=>o.type === "spiller" || o.type === "trener");
function arrowPath(a, n = 40) {
    const [p0, p2] = [
        a.fra,
        a.til
    ];
    const dx = p2[0] - p0[0];
    const dy = p2[1] - p0[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return [
        p0,
        p2
    ];
    const nrm = [
        -dy / len,
        dx / len
    ];
    const p1 = [
        (p0[0] + p2[0]) / 2 + nrm[0] * a.bue * len,
        (p0[1] + p2[1]) / 2 + nrm[1] * a.bue * len
    ];
    return Array.from({
        length: n
    }, (_, k)=>{
        const t = k / (n - 1);
        return [
            (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        ];
    });
}
function distToPath(p, path) {
    let best = Infinity;
    for(let k = 0; k < path.length - 1; k++){
        const a = path[k];
        const b = path[k + 1];
        const ab = [
            b[0] - a[0],
            b[1] - a[1]
        ];
        const l2 = ab[0] ** 2 + ab[1] ** 2;
        const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2));
        best = Math.min(best, Math.hypot(p[0] - (a[0] + t * ab[0]), p[1] - (a[1] + t * ab[1])));
    }
    return best;
}
function wrap(t, width = 18) {
    const out = [];
    let line = "";
    for (const word of t.split(/\s+/).filter(Boolean)){
        if (line && (line + " " + word).length > width) {
            out.push(line);
            line = word;
        } else line = line ? `${line} ${word}` : word;
    }
    if (line) out.push(line);
    return out.length ? out : [
        ""
    ];
}
function labelBox(l, lay) {
    const lines = wrap(l.tekst);
    const f = lay.sizes.font * 0.72;
    return {
        w: (Math.max(...lines.map((x)=>x.length)) * 0.56 * f + 1.4 * f) / lay.scale,
        h: (lines.length * 1.25 * f + 0.9 * f) / lay.scale
    };
}
function personName(o) {
    const t = o.tekst ? ` ${o.tekst}` : "";
    return o.type === "trener" ? `Trener${t}` : `${({
        "1": "Blå",
        "2": "Rød",
        joker: "Joker"
    })[o.lag ?? "1"]} spiller${t}`;
}
const lowerFirst = (x)=>x[0].toLowerCase() + x.slice(1);
function checkDrawing(d, widthPx = 1800) {
    const lay = layout(d, widthPx);
    const r = lay.sizes.playerR / lay.scale;
    const out = [];
    d.skisser.forEach((s, i)=>{
        const ppl = people(s);
        for(let a = 0; a < ppl.length; a++){
            for(let b = a + 1; b < ppl.length; b++){
                if (Math.hypot(ppl[a].o.x - ppl[b].o.x, ppl[a].o.y - ppl[b].o.y) < 2 * r) {
                    out.push({
                        skisse: i + 1,
                        type: "spillere",
                        melding: `${personName(ppl[a].o)} og ${lowerFirst(personName(ppl[b].o))} overlapper.`
                    });
                }
            }
        }
        for (const a of s.piler){
            const path = arrowPath(a);
            for (const { o } of ppl){
                const p = [
                    o.x,
                    o.y
                ];
                const atEnd = Math.hypot(p[0] - a.fra[0], p[1] - a.fra[1]) <= 1.6 * r || Math.hypot(p[0] - a.til[0], p[1] - a.til[1]) <= 1.6 * r;
                if (!atEnd && distToPath(p, path) < 0.9 * r) {
                    const what = {
                        pasning: "pasning",
                        lop: "løpsbane",
                        foring: "føring"
                    }[a.type];
                    out.push({
                        skisse: i + 1,
                        type: "pil",
                        melding: `En ${what} går gjennom ${lowerFirst(personName(o))}.`
                    });
                }
            }
        }
        for (const l of s.etiketter){
            const box = labelBox(l, lay);
            for (const { o } of ppl){
                if (Math.abs(o.x - l.x) < box.w / 2 + r && Math.abs(o.y - l.y) < box.h / 2 + r) {
                    out.push({
                        skisse: i + 1,
                        type: "etikett",
                        melding: `Etiketten «${l.tekst}» dekker ${lowerFirst(personName(o))}.`
                    });
                }
            }
        }
    });
    return out;
}
function fixDrawing(input, widthPx = 1800) {
    const d = structuredClone(input);
    const lay = layout(d, widthPx);
    const r = lay.sizes.playerR / lay.scale;
    for (const s of d.skisser){
        const ppl = people(s).map((p)=>p.i);
        const move = (k, dx, dy)=>{
            const o = s.objekter[k];
            const old = [
                o.x,
                o.y
            ];
            o.x = Math.min(Math.max(o.x + dx, -s.bane.marg + r), s.bane.bredde + s.bane.marg - r);
            o.y = Math.min(Math.max(o.y + dy, -s.bane.marg + r), s.bane.lengde + s.bane.marg - r);
            const shift = [
                o.x - old[0],
                o.y - old[1]
            ];
            for (const b of s.objekter){
                if (b.type === "ball" && Math.hypot(b.x - old[0], b.y - old[1]) <= 1.6 * r) {
                    b.x += shift[0];
                    b.y += shift[1];
                }
            }
            for (const a of s.piler){
                if (Math.hypot(a.fra[0] - old[0], a.fra[1] - old[1]) <= 1.6 * r) a.fra = [
                    a.fra[0] + shift[0],
                    a.fra[1] + shift[1]
                ];
                if (Math.hypot(a.til[0] - old[0], a.til[1] - old[1]) <= 1.6 * r) a.til = [
                    a.til[0] + shift[0],
                    a.til[1] + shift[1]
                ];
            }
        };
        for(let round = 0; round < 5; round++){
            let moved = false;
            for(let a = 0; a < ppl.length; a++){
                for(let b = a + 1; b < ppl.length; b++){
                    const pa = s.objekter[ppl[a]];
                    const pb = s.objekter[ppl[b]];
                    const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
                    if (dist < 2 * r) {
                        const dir = dist > 1e-6 ? [
                            (pb.x - pa.x) / dist,
                            (pb.y - pa.y) / dist
                        ] : [
                            1,
                            0
                        ];
                        const push = (2.15 * r - dist) / 2;
                        move(ppl[a], -dir[0] * push, -dir[1] * push);
                        move(ppl[b], dir[0] * push, dir[1] * push);
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
        const pos = ppl.map((k)=>[
                s.objekter[k].x,
                s.objekter[k].y
            ]);
        for (const l of s.etiketter){
            const box = labelBox(l, lay);
            const free = (y)=>!pos.some((p)=>Math.abs(p[0] - l.x) < box.w / 2 + r && Math.abs(p[1] - y) < box.h / 2 + r);
            if (!pos.length || free(l.y)) continue;
            for(let step = 0.25; step <= s.bane.lengde; step += 0.25){
                const cand = [
                    l.y - step,
                    l.y + step
                ].filter((y)=>y - box.h / 2 >= -s.bane.marg && y + box.h / 2 <= s.bane.lengde + s.bane.marg);
                const ok = cand.find(free);
                if (ok !== undefined) {
                    l.y = ok;
                    break;
                }
            }
        }
    }
    return d;
}
function compactDrawing(d) {
    const drop = (x, defaults)=>{
        const out = {};
        for (const [k, v] of Object.entries(x)){
            if (k in defaults && v === defaults[k]) continue;
            if (Array.isArray(v) && !v.length) continue;
            out[k] = v;
        }
        return out;
    };
    return {
        skisser: d.skisser.map((s)=>drop({
                ...s,
                bane: drop(s.bane, {
                    marg: 2.5,
                    midtlinje: false
                }),
                objekter: s.objekter.map((o)=>drop(o, {
                        farge: "oransje",
                        tekst: o.type === "trener" ? "T" : ""
                    })),
                piler: s.piler.map((a)=>drop(a, {
                        bue: 0
                    })),
                soner: s.soner.map((z)=>drop(z, {
                        tekst: ""
                    })),
                hjelpelinjer: s.hjelpelinjer.map((h)=>drop(h, {
                        tekst: ""
                    }))
            }, {
                tittel: ""
            }))
    };
}
function prettyDrawing(d) {
    if (!d) return "";
    const c = compactDrawing(d);
    const sketch = (s)=>"    {\n" + Object.entries(s).map(([k, v])=>Array.isArray(v) ? `      "${k}": [\n${v.map((x)=>`        ${JSON.stringify(x)}`).join(",\n")}\n      ]` : `      "${k}": ${JSON.stringify(v)}`).join(",\n") + "\n    }";
    return `{\n  "skisser": [\n${c.skisser.map(sketch).join(",\n")}\n  ]\n}`;
}
const EXAMPLE_DRAWING = {
    skisser: [
        {
            tittel: "3 mot 1",
            bane: {
                bredde: 12,
                lengde: 12,
                marg: 2.5
            },
            objekter: [
                {
                    type: "kjegle",
                    x: 0,
                    y: 0
                },
                {
                    type: "kjegle",
                    x: 12,
                    y: 0
                },
                {
                    type: "kjegle",
                    x: 0,
                    y: 12
                },
                {
                    type: "kjegle",
                    x: 12,
                    y: 12
                },
                {
                    type: "spiller",
                    lag: 1,
                    x: 2,
                    y: 2,
                    tekst: "1"
                },
                {
                    type: "ball",
                    x: 3,
                    y: 2.6
                },
                {
                    type: "spiller",
                    lag: 1,
                    x: 2,
                    y: 10,
                    tekst: "2"
                },
                {
                    type: "spiller",
                    lag: 1,
                    x: 10,
                    y: 3,
                    tekst: "3"
                },
                {
                    type: "spiller",
                    lag: 2,
                    x: 6,
                    y: 5.5,
                    tekst: "F"
                }
            ],
            piler: [
                {
                    type: "pasning",
                    fra: [
                        3,
                        2.6
                    ],
                    til: [
                        9.2,
                        3.3
                    ]
                },
                {
                    type: "lop",
                    fra: [
                        2,
                        10
                    ],
                    til: [
                        5,
                        10.5
                    ],
                    bue: 0.2
                }
            ],
            tekster: [
                {
                    x: 6,
                    y: -1.4,
                    tekst: "Rute 12 × 12 m"
                }
            ]
        }
    ]
};
function trimPath(path, amount) {
    let acc = 0;
    for(let k = 1; k < path.length; k++){
        const seg = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
        if (acc + seg >= amount) {
            const t = seg ? (amount - acc) / seg : 0;
            const start = [
                path[k - 1][0] + t * (path[k][0] - path[k - 1][0]),
                path[k - 1][1] + t * (path[k][1] - path[k - 1][1])
            ];
            return [
                start,
                ...path.slice(k)
            ];
        }
        acc += seg;
    }
    return path;
}
function wave(p, amp, wavelength) {
    const cum = [
        0
    ];
    for(let k = 1; k < p.length; k++)cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
    const total = cum.at(-1);
    const stop = Math.max(0, total - wavelength * 0.6);
    const n = Math.max(20, Math.round(stop / 2));
    const at = (s)=>{
        let k = 1;
        while(k < cum.length - 1 && cum[k] < s)k++;
        const t = cum[k] === cum[k - 1] ? 0 : (s - cum[k - 1]) / (cum[k] - cum[k - 1]);
        return [
            p[k - 1][0] + t * (p[k][0] - p[k - 1][0]),
            p[k - 1][1] + t * (p[k][1] - p[k - 1][1])
        ];
    };
    const out = [];
    for(let j = 0; j <= n; j++){
        const s = stop * j / n;
        const a = at(s);
        const b = at(Math.min(total, s + 0.5));
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const off = amp * Math.sin(2 * Math.PI * s / wavelength);
        out.push([
            a[0] - (b[1] - a[1]) / l * off,
            a[1] + (b[0] - a[0]) / l * off
        ]);
    }
    out.push(p.at(-1));
    return out;
}
function head(path, size) {
    const end = path.at(-1);
    const back = path[Math.max(0, path.length - 4)];
    const l = Math.hypot(end[0] - back[0], end[1] - back[1]) || 1;
    const d = [
        (end[0] - back[0]) / l,
        (end[1] - back[1]) / l
    ];
    const n = [
        -d[1],
        d[0]
    ];
    const base = [
        end[0] - d[0] * size,
        end[1] - d[1] * size
    ];
    return [
        end,
        [
            base[0] + n[0] * size * 0.45,
            base[1] + n[1] * size * 0.45
        ],
        [
            base[0] - n[0] * size * 0.45,
            base[1] - n[1] * size * 0.45
        ]
    ];
}
function textBox(out, x, y, label, lay, alpha, wrapAt) {
    const f = lay.sizes.font * 0.72;
    const lines = wrap(label, wrapAt);
    const w = Math.max(...lines.map((l)=>l.length)) * 0.56 * f + 1.4 * f;
    const h = lines.length * 1.25 * f + 0.9 * f;
    out.push({
        k: "rect",
        x: x - w / 2,
        y: y - h / 2,
        w,
        h,
        fill: COLOURS.labelFill,
        rx: f * 0.4,
        opacity: alpha
    });
    lines.forEach((l, i)=>{
        out.push({
            k: "text",
            x,
            y: y - h / 2 + 0.45 * f + (i + 0.5) * 1.25 * f,
            text: l,
            size: f,
            fill: "#FFFFFF",
            bold: true,
            anchor: "middle"
        });
    });
}
function drawingShapes(d, widthPx = 1800) {
    const lay = layout(d, widthPx);
    const sz = lay.sizes;
    const out = [];
    // Grass: six vertical stripes.
    for(let k = 0; k < 6; k++){
        out.push({
            k: "rect",
            x: k * lay.width / 6,
            y: 0,
            w: lay.width / 6 + 1,
            h: lay.height,
            fill: COLOURS.grass[k % 2]
        });
    }
    d.skisser.forEach((s, i)=>{
        const b = s.bane;
        const P = (x, y)=>px(lay, s, i, x, y);
        for (const z of s.soner){
            const [a, c] = [
                P(z.x, z.y),
                P(z.x + z.b, z.y + z.h)
            ];
            out.push({
                k: "rect",
                x: Math.min(a[0], c[0]),
                y: Math.min(a[1], c[1]),
                w: Math.abs(c[0] - a[0]),
                h: Math.abs(c[1] - a[1]),
                fill: "#FFFFFF",
                opacity: 0.18
            });
            if (z.tekst) {
                const t = P(z.x + z.b / 2, b.lengde + b.marg / 2);
                out.push({
                    k: "text",
                    x: t[0],
                    y: t[1],
                    text: z.tekst,
                    size: sz.font * 0.68,
                    fill: "#FFFFFF",
                    bold: true,
                    anchor: "middle"
                });
            }
        }
        const [c0, c1] = [
            P(0, 0),
            P(b.bredde, b.lengde)
        ];
        out.push({
            k: "rect",
            x: c0[0],
            y: c1[1],
            w: c1[0] - c0[0],
            h: c0[1] - c1[1],
            stroke: COLOURS.line,
            sw: sz.line
        });
        if (b.midtlinje) out.push({
            k: "poly",
            points: [
                P(b.bredde / 2, 0),
                P(b.bredde / 2, b.lengde)
            ],
            stroke: COLOURS.line,
            sw: sz.line,
            closed: false
        });
        for (const l of s.linjer)out.push({
            k: "poly",
            points: [
                P(...l.fra),
                P(...l.til)
            ],
            stroke: COLOURS.line,
            sw: sz.line,
            closed: false
        });
        for (const l of s.hjelpelinjer){
            const m = [
                P(...l.fra),
                P(...l.til)
            ];
            out.push({
                k: "poly",
                points: m,
                stroke: COLOURS.helper,
                sw: sz.line * 1.1,
                closed: false,
                dash: [
                    sz.line * 3,
                    sz.line * 3
                ]
            });
            if (l.tekst) {
                const top = m[0][1] < m[1][1] ? m[0] : m[1];
                out.push({
                    k: "text",
                    x: top[0],
                    y: top[1] - b.marg * lay.scale / 2,
                    text: l.tekst,
                    size: sz.font * 0.68,
                    fill: COLOURS.helper,
                    bold: true,
                    anchor: "middle"
                });
            }
        }
        for (const o of s.objekter){
            const p = P(o.x, o.y);
            if (o.type === "maal" || o.type === "smaamaal") {
                const depth = (o.type === "maal" ? 1.3 : 0.9) * lay.scale;
                const half = (o.bredde ?? 2) / 2 * lay.scale;
                const horizontal = o.side === "venstre" || o.side === "hoyre";
                const sign = o.side === "venstre" || o.side === "topp" ? -1 : 1;
                const cx = horizontal ? p[0] + sign * depth / 2 : p[0];
                const cy = horizontal ? p[1] : p[1] + sign * depth / 2;
                const w = horizontal ? depth : 2 * half;
                const h = horizontal ? 2 * half : depth;
                out.push({
                    k: "rect",
                    x: cx - w / 2,
                    y: cy - h / 2,
                    w,
                    h,
                    fill: "#FFFFFF"
                });
                const step = o.type === "maal" ? depth / 3.5 : Math.min(w, h) / 2.2;
                for(let x = cx - w / 2 + step; x < cx + w / 2; x += step){
                    out.push({
                        k: "poly",
                        points: [
                            [
                                x,
                                cy - h / 2
                            ],
                            [
                                x,
                                cy + h / 2
                            ]
                        ],
                        stroke: o.type === "maal" ? "#d8d8d8" : "#555555",
                        sw: sz.line * 0.5,
                        closed: false
                    });
                }
                for(let y = cy - h / 2 + step; y < cy + h / 2; y += step){
                    out.push({
                        k: "poly",
                        points: [
                            [
                                cx - w / 2,
                                y
                            ],
                            [
                                cx + w / 2,
                                y
                            ]
                        ],
                        stroke: o.type === "maal" ? "#d8d8d8" : "#555555",
                        sw: sz.line * 0.5,
                        closed: false
                    });
                }
                out.push({
                    k: "rect",
                    x: cx - w / 2,
                    y: cy - h / 2,
                    w,
                    h,
                    stroke: "#FFFFFF",
                    sw: sz.line * 1.4
                });
            }
            if (o.type === "kjegle") {
                const h = sz.cone;
                out.push({
                    k: "poly",
                    points: [
                        [
                            p[0] - h / 2,
                            p[1] + h * 0.38
                        ],
                        [
                            p[0] + h / 2,
                            p[1] + h * 0.38
                        ],
                        [
                            p[0],
                            p[1] - h * 0.5
                        ]
                    ],
                    fill: COLOURS.cone[o.farge ?? "oransje"],
                    stroke: "#c45c00",
                    sw: sz.line * 0.5,
                    closed: true
                });
            }
        }
        const ppl = people(s).map((x)=>x.o);
        for (const a of s.piler){
            let path = arrowPath(a).map(([x, y])=>P(x, y));
            const near = (pt)=>ppl.some((o)=>Math.hypot(o.x - pt[0], o.y - pt[1]) * lay.scale <= sz.playerR * 1.15);
            if (near(a.fra)) path = trimPath(path, sz.playerR + sz.gap);
            if (near(a.til)) path = trimPath([
                ...path
            ].reverse(), sz.playerR + sz.gap * 2).reverse();
            if (path.length < 2) continue;
            const col = a.type === "pasning" ? "#FFFFFF" : "#121212";
            const hd = head(path, sz.head);
            const base = [
                (hd[1][0] + hd[2][0]) / 2,
                (hd[1][1] + hd[2][1]) / 2
            ];
            let line = [
                ...path.slice(0, -1),
                base
            ];
            if (a.type === "foring") line = wave(line, sz.playerR * 0.28, sz.playerR * 1.1);
            out.push({
                k: "poly",
                points: line,
                stroke: col,
                sw: sz.arrow,
                closed: false,
                dash: a.type === "lop" ? [
                    sz.arrow * 2.2,
                    sz.arrow * 2.2
                ] : undefined
            });
            out.push({
                k: "poly",
                points: hd,
                fill: col,
                closed: true
            });
        }
        for (const o of ppl){
            const p = P(o.x, o.y);
            const fill = o.type === "trener" ? COLOURS.trainer : COLOURS.team[o.lag ?? "1"];
            const tc = o.type === "trener" ? "#FFFFFF" : COLOURS.teamText[o.lag ?? "1"];
            out.push({
                k: "circle",
                cx: p[0] + sz.playerR * 0.12,
                cy: p[1] + sz.playerR * 0.14,
                r: sz.playerR,
                fill: COLOURS.shadow
            });
            out.push({
                k: "circle",
                cx: p[0],
                cy: p[1],
                r: sz.playerR,
                fill,
                stroke: "#FFFFFF",
                sw: sz.line * 1.1
            });
            if (o.tekst) {
                const f = sz.font * (o.tekst.length > 1 ? 0.6 : 0.72);
                out.push({
                    k: "text",
                    x: p[0],
                    y: p[1],
                    text: o.tekst,
                    size: f,
                    fill: tc,
                    bold: true,
                    anchor: "middle"
                });
            }
        }
        for (const o of s.objekter.filter((x)=>x.type === "ball")){
            const p = P(o.x, o.y);
            out.push({
                k: "circle",
                cx: p[0],
                cy: p[1],
                r: sz.ballR,
                fill: "#FFFFFF",
                stroke: "#121212",
                sw: sz.line * 0.9
            });
            out.push({
                k: "circle",
                cx: p[0],
                cy: p[1],
                r: sz.ballR * 0.38,
                fill: "#121212"
            });
        }
        for (const l of s.etiketter){
            const p = P(l.x, l.y);
            textBox(out, p[0], p[1], l.tekst, lay, 0.85, 18);
        }
        for (const l of s.tekster){
            const p = P(l.x, l.y);
            out.push({
                k: "text",
                x: p[0],
                y: p[1],
                text: l.tekst,
                size: sz.font * 0.68,
                fill: "#FFFFFF",
                bold: true,
                anchor: "middle"
            });
        }
        if (s.tittel) {
            const p = P(b.bredde / 2, b.lengde + b.marg / 2);
            textBox(out, p[0], p[1], s.tittel, lay, 0.55, 40);
        }
    });
    return {
        width: lay.width,
        height: lay.height,
        shapes: out
    };
}
}),
"[project]/lib/plans/exercise-edits.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EDIT_FIELDS",
    ()=>EDIT_FIELDS,
    "EDIT_KINDS",
    ()=>EDIT_KINDS,
    "changedFieldsText",
    ()=>changedFieldsText,
    "exerciseChanges",
    ()=>exerciseChanges,
    "planChanges",
    ()=>planChanges
]);
const EDIT_KINDS = {
    ki_forslag: "KI foreslo",
    retting_av_ki: "Treneren rettet KI",
    manuell: "Endret",
    opplegg_etter_ki: "Opplegg endret etter KI"
};
const EDIT_FIELDS = {
    name: "Navn",
    category: "Kategori",
    themes: "Temaer",
    min_players: "Min. spillere",
    max_players: "Maks spillere",
    duration_minutes: "Minutter",
    area: "Område",
    organisation: "Organisering",
    execution: "Gjennomføring",
    learning_points: "Læringsmomenter",
    questions: "Spørsmål",
    easier: "Enklere",
    harder: "Vanskeligere",
    nff_url: "Lenke",
    drawing: "Tegning",
    status: "Status",
    bands: "Aldersbånd",
    nff_activity: "Aktivitet",
    nff_tags: "NFF-tagger"
};
/** Text is cut here in the log; enough to see what changed. */ const MAX = 1000;
function norm(k, x) {
    if (Array.isArray(x)) return (k === "themes" ? x : [
        ...x
    ].sort()).map((s)=>String(s).trim()).filter(Boolean).join(", ");
    const t = typeof x === "string" ? x : x === null || x === undefined ? "" : String(x);
    if (k === "drawing") {
        try {
            return t.trim() ? JSON.stringify(JSON.parse(t)) : "";
        } catch  {
            return t.trim();
        }
    }
    if (k === "themes") return t.split(",").map((s)=>s.trim()).filter(Boolean).join(", ");
    return t.split("\n").map((l)=>l.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n");
}
function exerciseChanges(before, after) {
    const out = {};
    for (const k of Object.keys(EDIT_FIELDS)){
        const a = norm(k, before[k]);
        const b = norm(k, after[k]);
        if (a === b) continue;
        out[k] = k === "drawing" ? {
            fra: a ? "(tegning)" : "",
            til: b ? "(tegning)" : ""
        } : {
            fra: a.slice(0, MAX),
            til: b.slice(0, MAX)
        };
    }
    return out;
}
function planChanges(before, after) {
    return {
        beholdt: after.filter((c)=>before.includes(c)),
        fjernet: before.filter((c)=>!after.includes(c)),
        lagt_til: after.filter((c)=>!before.includes(c))
    };
}
function changedFieldsText(changes) {
    return Object.keys(changes).map((k)=>EDIT_FIELDS[k] ?? k).join(", ");
}
}),
"[project]/lib/plans/exercise-values.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adjustedValues",
    ()=>adjustedValues,
    "exerciseInputFrom",
    ()=>exerciseInputFrom,
    "exerciseValues",
    ()=>exerciseValues
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/drawing.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/plan.ts [instrumentation] (ecmascript)");
;
;
const n = (x)=>x === null ? "" : String(x);
function exerciseValues(b) {
    return {
        name: b.name,
        category: b.category,
        themes: b.themes.join(", "),
        min_players: n(b.min_players),
        max_players: n(b.max_players),
        duration_minutes: n(b.duration_minutes),
        area: b.area,
        organisation: b.organisation,
        execution: b.execution,
        learning_points: b.learning_points,
        questions: b.questions,
        easier: b.easier,
        harder: b.harder,
        nff_url: b.nff_url,
        drawing: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["prettyDrawing"])(b.drawing),
        status: b.status,
        bands: b.bands,
        nff_activity: b.nff_activity,
        nff_tags: b.nff_tags
    };
}
function adjustedValues(b, e, extra) {
    const lines = (x)=>x.join("\n");
    return {
        ...exerciseValues(b),
        name: e.navn,
        category: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["categoryKey"])(e.kategori),
        min_players: n(extra.min_players ?? b.min_players),
        max_players: n(extra.max_players ?? b.max_players),
        duration_minutes: n(extra.duration_minutes ?? b.duration_minutes),
        area: extra.area || b.area,
        organisation: lines(e.organisering),
        execution: lines(e.gjennomforing),
        learning_points: lines(e.laeringsmomenter),
        questions: lines(e.sporsmal),
        easier: e.enklere,
        harder: e.vanskeligere,
        nff_url: e.nff_url,
        drawing: e.tegning ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["prettyDrawing"])(e.tegning) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["prettyDrawing"])(b.drawing),
        nff_activity: e.aktivitet ?? b.nff_activity,
        nff_tags: e.nff_tags ?? b.nff_tags
    };
}
function exerciseInputFrom(v) {
    return {
        ...v,
        themes: v.themes.split(",").map((t)=>t.trim()).filter(Boolean)
    };
}
}),
"[project]/lib/plans/feedback.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FEEDBACK_BODY_MAX",
    ()=>FEEDBACK_BODY_MAX,
    "FEEDBACK_TAGS",
    ()=>FEEDBACK_TAGS,
    "FEEDBACK_TEXT_MAX",
    ()=>FEEDBACK_TEXT_MAX,
    "FeedbackError",
    ()=>FeedbackError,
    "RATINGS",
    ()=>RATINGS,
    "SESSION_TAGS",
    ()=>SESSION_TAGS,
    "USE_AGAIN",
    ()=>USE_AGAIN,
    "feedbackSummary",
    ()=>feedbackSummary,
    "meanText",
    ()=>meanText,
    "ratingsText",
    ()=>ratingsText,
    "shouldAvoid",
    ()=>shouldAvoid,
    "tagLabel",
    ()=>tagLabel,
    "validateBankFeedback",
    ()=>validateBankFeedback,
    "validateFeedback",
    ()=>validateFeedback
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sensitive.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/plan.ts [instrumentation] (ecmascript)");
;
;
const RATINGS = {
    3: "👍 Bra",
    2: "👌 OK",
    1: "👎 Dårlig"
};
const FEEDBACK_TAGS = {
    for_lett: "for lett",
    for_vanskelig: "for vanskelig",
    goy: "gøy",
    kjedelig: "kjedelig",
    ko: "mye venting/kø",
    hoy_intensitet: "høy intensitet",
    lav_intensitet: "lav intensitet",
    uklar: "uklar forklaring",
    bane_liten: "banen for liten",
    bane_stor: "banen for stor",
    for_lang: "for lang",
    for_kort: "for kort",
    tema_ja: "fikk fram temaet",
    tema_nei: "fikk ikke fram temaet"
};
const SESSION_TAGS = {
    god_progresjon: "god progresjon",
    god_flyt: "god flyt mellom øvelsene",
    darlig_flyt: "dårlig flyt mellom øvelsene",
    mye_organisering: "mye tid til organisering",
    for_mye_program: "for mye på programmet",
    mye_aktivitet: "mye aktivitet for alle",
    mye_venting: "mye venting",
    god_mestring: "god mestring",
    passet_gruppen: "passet antall spillere",
    for_faa_trenere: "for få trenere",
    okt_tema_ja: "fikk fram temaet",
    okt_tema_nei: "fikk ikke fram temaet"
};
function tagLabel(key) {
    return FEEDBACK_TAGS[key] ?? SESSION_TAGS[key] ?? key;
}
const USE_AGAIN = {
    yes: "Ja",
    changes: "Med endringer",
    no: "Nei"
};
const FEEDBACK_BODY_MAX = 300;
const FEEDBACK_TEXT_MAX = 3000;
class FeedbackError extends Error {
}
function intIn(x, what, lo, hi) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["txt"])(x);
    if (!t) return null;
    const v = Number(t);
    if (!Number.isInteger(v) || v < lo || v > hi) throw new FeedbackError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
    return v;
}
/** Check one row; null when nothing is filled in. */ function checkRow(r, what, session, names) {
    const rating = intIn(r.rating, `${what}: vurderingen`, 1, 3);
    const tags = [
        ...new Set((r.tags ?? []).filter(Boolean))
    ];
    const known = session ? SESSION_TAGS : FEEDBACK_TAGS;
    if (tags.some((t)=>!(t in known))) throw new FeedbackError(`${what}: ukjent stikkord.`);
    const body = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["txt"])(r.body);
    if (body.length > FEEDBACK_BODY_MAX) throw new FeedbackError(`${what}: teksten kan ha maks ${FEEDBACK_BODY_MAX} tegn.`);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(body)) throw new FeedbackError(`${what}: teksten skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.`);
    const np = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["namesProblem"])(body, names, "Skriv uten navn, evalueringene kan oppsummeres av KI");
    if (np) throw new FeedbackError(`${what}: ${np}`);
    const useAgain = session ? "" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["txt"])(r.use_again);
    if (useAgain && !(useAgain in USE_AGAIN)) throw new FeedbackError(`${what}: ugyldig svar på «Bruke igjen?».`);
    const minutes = session ? null : intIn(r.actual_minutes, `${what}: faktisk tid`, 0, 240);
    const players = session ? intIn(r.actual_players, "Antall spillere", 0, 200) : null;
    const filled = rating !== null || tags.length || body || useAgain || session && players !== null;
    if (!filled) return null;
    if (rating === null && !session) throw new FeedbackError(`${what}: velg Bra, OK eller Dårlig.`);
    return {
        rating,
        tags,
        actual_minutes: minutes,
        actual_players: players,
        body,
        use_again: useAgain
    };
}
function validateFeedback(rows, plan, names) {
    const n = plan.ovelser.length;
    const out = rows.flatMap((r)=>{
        const session = r.exercise_no === null;
        if (!session && (!Number.isInteger(r.exercise_no) || r.exercise_no < 1 || r.exercise_no > n)) throw new FeedbackError("Ukjent øvelse.");
        const v = checkRow(r, session ? "Hele økta" : `Øvelse ${r.exercise_no}`, session, names);
        if (!v) return [];
        return [
            {
                exercise_no: session ? null : r.exercise_no,
                exercise_code: session ? "" : plan.ovelser[r.exercise_no - 1].kode,
                ...v
            }
        ];
    });
    if (!out.length) throw new FeedbackError("Vurder minst én øvelse eller hele økta.");
    return out;
}
function validateBankFeedback(r, exerciseCode, names) {
    const v = checkRow(r, "Øvelsen", false, names);
    return v ? {
        exercise_no: null,
        exercise_code: exerciseCode,
        ...v
    } : null;
}
function ratingsText(counts) {
    const icons = {
        "3": "👍",
        "2": "👌",
        "1": "👎"
    };
    return [
        "3",
        "2",
        "1"
    ].filter((k)=>counts[k]).map((k)=>`${icons[k]} ${counts[k]}`).join(" · ");
}
function shouldAvoid(b) {
    const again = b.fb_yes + b.fb_changes + b.fb_no;
    return b.fb_n > 0 && (b.fb_mean !== null && b.fb_mean < 2 || again > 0 && b.fb_no * 2 > again);
}
const meanText = (x)=>x.toFixed(1).replace(".", ",");
function feedbackSummary(b) {
    if (!b.fb_n) return "Ikke evaluert";
    const tags = Object.entries(b.fb_tags).sort((x, y)=>y[1] - x[1]).slice(0, 2).map(([k])=>FEEDBACK_TAGS[k] ?? k);
    return [
        b.fb_sessions ? `${b.fb_sessions} ${b.fb_sessions === 1 ? "økt" : "økter"}` : "",
        b.fb_bank ? `${b.fb_bank} fra banken` : "",
        `snitt ${meanText(b.fb_mean ?? 0)} av 3`,
        b.fb_minutes ? `${Math.round(b.fb_minutes)} min` : "",
        tags.join(", ")
    ].filter(Boolean).join(" · ");
}
}),
"[project]/lib/plans/improvements.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ARCHIVING_KINDS",
    ()=>ARCHIVING_KINDS,
    "NEW_EXERCISE_KINDS",
    ()=>NEW_EXERCISE_KINDS,
    "PROPOSAL_KINDS",
    ()=>PROPOSAL_KINDS,
    "PROPOSAL_STATUSES",
    ()=>PROPOSAL_STATUSES,
    "QUIET_DAYS",
    ()=>QUIET_DAYS,
    "REJECTION_MAX",
    ()=>REJECTION_MAX,
    "bandSplit",
    ()=>bandSplit,
    "proposalPlan",
    ()=>proposalPlan,
    "proposalWish",
    ()=>proposalWish,
    "reasonText",
    ()=>reasonText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/feedback.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/observations.ts [instrumentation] (ecmascript)");
;
;
const PROPOSAL_KINDS = {
    ny_versjon: "Ny versjon",
    tilpasning: "Tilpasning",
    variant: "Variant",
    arkiver: "Arkiver",
    tilbakerulling: "Tilbakerulling",
    ny_ovelse: "Ny øvelse",
    overlapp: "Overlapp",
    metadata: "Mangler info"
};
const ARCHIVING_KINDS = [
    "arkiver",
    "overlapp"
];
const NEW_EXERCISE_KINDS = [
    "variant",
    "ny_ovelse"
];
const PROPOSAL_STATUSES = {
    ny: "Venter",
    brukt: "Brukt",
    endret: "Brukt med endringer",
    avvist: "Avvist",
    utdatert: "Utdatert",
    auto: "Gjort automatisk"
};
const REJECTION_MAX = 300;
const QUIET_DAYS = 60;
/** Archive: rated this low by at least this many. */ const ARCHIVE_BELOW = 1.6;
const ARCHIVE_MIN_RATINGS = 5;
/** Variant: one age band rates it well and another poorly, each from enough ratings. */ const VARIANT_GOOD = 2.4;
const VARIANT_POOR = 1.7;
const VARIANT_MIN_RATINGS = 3;
function bandSplit(p) {
    const enough = (p.bands ?? []).filter((b)=>b.ratings >= VARIANT_MIN_RATINGS);
    const good = enough.filter((b)=>b.mean >= VARIANT_GOOD).sort((a, b)=>b.mean - a.mean)[0];
    const poor = enough.filter((b)=>b.mean <= VARIANT_POOR).sort((a, b)=>a.mean - b.mean)[0];
    return good && poor ? {
        good,
        poor
    } : null;
}
function proposalPlan(p, variantFor = []) {
    const problems = p.patterns.filter((x)=>x.pattern && !x.positive);
    const signature = (kind)=>[
            kind,
            ...problems.map((x)=>x.kind).sort(),
            p.trend
        ].filter(Boolean).join(":");
    // Good for one age, poor for another: a variant for the one, rather than changing it for all.
    const split = bandSplit(p);
    if (split && !variantFor.includes(split.poor.band)) {
        const forBand = problems.filter((x)=>!x.band || x.band === split.poor.band);
        return {
            kind: "variant",
            signature: `variant:${split.poor.band}`,
            problems: forBand,
            band: split.poor,
            goodBand: split.good
        };
    }
    if (p.score !== null && p.score < ARCHIVE_BELOW && p.ratings >= ARCHIVE_MIN_RATINGS) return {
        kind: "arkiver",
        signature: signature("arkiver"),
        problems
    };
    if (!problems.length) return null;
    const kind = problems.every((x)=>x.context) ? "tilpasning" : "ny_versjon";
    return {
        kind,
        signature: signature(kind),
        problems
    };
}
const label = (k)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["OBSERVATION_KINDS"][k]?.label ?? k;
function problemLine(x) {
    const where = [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["OBSERVATION_PARTS"][x.part] ?? "",
        x.context
    ].filter(Boolean).join(", ");
    return `${x.sessions} ${x.sessions === 1 ? "økt" : "økter"} og ${x.trainers} ${x.trainers === 1 ? "trener" : "trenere"} nevnte ${label(x.kind)}${where ? ` (${where})` : ""}.`;
}
function reasonText(p, plan) {
    const lines = plan.problems.slice(0, 3).map(problemLine);
    if (plan.kind === "variant" && plan.band && plan.goodBand) lines.unshift(variantLine(plan.band, plan.goodBand));
    const ideas = [
        ...new Set(plan.problems.flatMap((x)=>x.suggestions))
    ].slice(0, 3);
    if (ideas.length) lines.push(`Forslag fra trenerne: ${ideas.map((s)=>`«${s}»`).join(", ")}.`);
    if (p.trend) lines.push(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["TREND_TEXT"][p.trend]);
    if (plan.kind === "arkiver" && p.score !== null) lines.unshift(`Vektet snitt ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["meanText"])(p.score)} av 3 fra ${p.ratings} vurderinger.`);
    return lines.join(" ").slice(0, 1000);
}
const scoreText = (b)=>`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["meanText"])(b.mean)} av 3 (${b.ratings} vurderinger)`;
function variantLine(poor, good) {
    return `Øvelsen fungerer for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(good.band)}, snitt ${scoreText(good)}, men ikke for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(poor.band)}, snitt ${scoreText(poor)}.`;
}
function proposalWish(plan, rejections, max = 1000) {
    const head = plan.kind === "variant" && plan.band && plan.goodBand ? `${variantLine(plan.band, plan.goodBand)} Lag en variant av øvelsen for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$observations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["bandLabel"])(plan.band.band)} (NFF-båndet), tilpasset alderen: organisering, regler, banestørrelse og læringsmomenter. Den vanlige øvelsen beholdes for de andre.` : plan.kind === "tilpasning" ? "Trenerne har gitt innspill som bare gjelder i noen situasjoner. Legg til en tilpasning for situasjonen (i organiseringen, eller under enklere/vanskeligere), og la resten av øvelsen være som den er." : "Trenerne har gitt disse innspillene fra evalueringer. Lag en ny versjon som løser problemene, og endre ikke mer enn det trengs.";
    const problems = plan.problems.slice(0, 3).map((x)=>{
        const ideas = x.suggestions.length ? ` Forslag fra trenerne: ${x.suggestions.map((s)=>`«${s}»`).join(", ")}.` : "";
        return `- ${problemLine(x)}${ideas}`;
    });
    const turnedDown = rejections.slice(0, 2).map((r)=>`- «${r}»`);
    const parts = [
        head,
        ...problems,
        ...turnedDown.length ? [
            "Tidligere forslag ble avvist med denne begrunnelsen:",
            ...turnedDown
        ] : []
    ];
    let out = "";
    for (const part of parts){
        if ((out + part).length + 1 > max) break;
        out = out ? `${out}\n${part}` : part;
    }
    return out;
}
}),
"[project]/lib/plans/observations.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BIG_GROUP",
    ()=>BIG_GROUP,
    "OBSERVATION_KINDS",
    ()=>OBSERVATION_KINDS,
    "OBSERVATION_PARTS",
    ()=>OBSERVATION_PARTS,
    "SUGGESTION_MAX",
    ()=>SUGGESTION_MAX,
    "TREND_TEXT",
    ()=>TREND_TEXT,
    "analysePatterns",
    ()=>analysePatterns,
    "bandLabel",
    ()=>bandLabel,
    "bankMean",
    ()=>bankMean,
    "patternText",
    ()=>patternText,
    "tagObservations",
    ()=>tagObservations
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/bands.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/feedback.ts [instrumentation] (ecmascript)");
;
;
const OBSERVATION_KINDS = {
    ...Object.fromEntries(Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["FEEDBACK_TAGS"]).map(([k, label])=>[
            k,
            {
                label,
                positive: [
                    "goy",
                    "hoy_intensitet",
                    "tema_ja"
                ].includes(k)
            }
        ])),
    tegning: {
        label: "feil eller uklar tegning",
        positive: false
    },
    regler: {
        label: "uklare regler",
        positive: false
    },
    annet: {
        label: "annet",
        positive: false
    }
};
const OBSERVATION_PARTS = {
    organisering: "organisering",
    gjennomforing: "gjennomføring",
    tilpasning: "enklere/vanskeligere",
    tegning: "tegning"
};
/** Which part of the exercise a keyword is about. */ const TAG_PART = {
    ko: "organisering",
    bane_liten: "organisering",
    bane_stor: "organisering",
    for_lett: "tilpasning",
    for_vanskelig: "tilpasning",
    uklar: "gjennomforing"
};
const SUGGESTION_MAX = 200;
const bandLabel = (b)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["NFF_BANDS"].find((x)=>x.key === b)?.label ?? b;
/** Newer evaluations count more: half the weight after this many days. */ const HALF_LIFE_DAYS = 90;
/** How many ratings of the bank's mean a score starts with. */ const PRIOR = 2;
const BIG_GROUP = 12;
const TREND_DAYS = 60;
const REMOVED_DAYS = 90;
const DAY = 86_400_000;
const weight = (at, now)=>0.5 ** (Math.max(0, now.getTime() - at.getTime()) / DAY / HALF_LIFE_DAYS);
const mean = (xs)=>xs.length ? xs.reduce((a, b)=>a + b, 0) / xs.length : null;
function tagObservations(tags) {
    return tags.filter((t)=>t in OBSERVATION_KINDS).map((kind)=>({
            kind,
            part: TAG_PART[kind] ?? "",
            strength: "tydelig",
            suggestion: ""
        }));
}
function bankMean(rows, now) {
    let sw = 0;
    let s = 0;
    for (const r of rows){
        if (r.rating === null) continue;
        const w = weight(r.at, now);
        sw += w;
        s += w * r.rating;
    }
    return sw ? s / sw : 2.5;
}
function contextOf(obs, all) {
    const known = obs.map((o)=>o.players).filter((p)=>p !== null);
    if (known.length >= 2) {
        const usedBig = all.some((r)=>r.players !== null && r.players >= BIG_GROUP);
        const usedSmall = all.some((r)=>r.players !== null && r.players < BIG_GROUP);
        if (known.every((p)=>p >= BIG_GROUP) && usedSmall) return {
            context: `med ${BIG_GROUP} eller flere spillere`,
            band: ""
        };
        if (known.every((p)=>p < BIG_GROUP) && usedBig) return {
            context: `med færre enn ${BIG_GROUP} spillere`,
            band: ""
        };
    }
    // Only one age band says it, and the exercise is used in others too.
    const bands = obs.map((o)=>o.band);
    const band = bands[0];
    if (bands.length >= 2 && band && bands.every((b)=>b === band) && all.some((r)=>r.band && r.band !== band)) return {
        context: `for ${bandLabel(band)}`,
        band
    };
    return {
        context: "",
        band: ""
    };
}
function bandScores(rated) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["NFF_BANDS"].flatMap(({ key })=>{
        const rs = rated.filter((r)=>r.band === key);
        if (!rs.length) return [];
        return [
            {
                band: key,
                mean: Math.round(rs.reduce((s, r)=>s + r.rating, 0) / rs.length * 100) / 100,
                ratings: rs.length,
                trainers: new Set(rs.map((r)=>r.author)).size
            }
        ];
    });
}
function analysePatterns(evaluations, observations, removed, settings, now = new Date()) {
    const m = bankMean(evaluations, now);
    const byFeedback = new Map();
    for (const o of observations)byFeedback.set(o.feedbackId, [
        ...byFeedback.get(o.feedbackId) ?? [],
        o
    ]);
    const byCode = new Map();
    for (const r of evaluations)byCode.set(r.code, [
        ...byCode.get(r.code) ?? [],
        r
    ]);
    const codes = new Set([
        ...byCode.keys(),
        ...removed.map((r)=>r.code)
    ]);
    return [
        ...codes
    ].sort().map((code)=>{
        const rows = byCode.get(code) ?? [];
        const rated = rows.filter((r)=>r.rating !== null);
        let sw = 0;
        let s = 0;
        for (const r of rated){
            const w = weight(r.at, now);
            sw += w;
            s += w * r.rating;
        }
        const score = rated.length ? Math.round((PRIOR * m + s) / (PRIOR + sw) * 100) / 100 : null;
        // One observation per kind per evaluation: a keyword and KI saying the same is the same thing.
        const seen = new Map();
        for (const row of rows){
            const own = new Map();
            for (const o of tagObservations(row.tags))own.set(o.kind, o);
            for (const o of byFeedback.get(row.feedbackId) ?? []){
                const had = own.get(o.kind);
                own.set(o.kind, had ? {
                    ...had,
                    part: had.part || o.part,
                    suggestion: o.suggestion || had.suggestion
                } : o);
            }
            for (const o of own.values())seen.set(o.kind, [
                ...seen.get(o.kind) ?? [],
                {
                    row,
                    o
                }
            ]);
        }
        const patterns = [
            ...seen.entries()
        ].map(([kind, xs])=>{
            const sessions = new Set(xs.map((x)=>x.row.session)).size;
            const trainers = new Set(xs.map((x)=>x.row.author)).size;
            const parts = xs.map((x)=>x.o.part).filter(Boolean);
            const part = parts.sort((a, b)=>parts.filter((p)=>p === b).length - parts.filter((p)=>p === a).length)[0] ?? "";
            return {
                kind,
                positive: OBSERVATION_KINDS[kind]?.positive ?? false,
                count: xs.length,
                sessions,
                trainers,
                pattern: sessions >= settings.minSessions || trainers >= settings.minTrainers,
                part,
                ...contextOf(xs.map((x)=>x.row), rows),
                suggestions: [
                    ...new Set(xs.map((x)=>x.o.suggestion.trim()).filter(Boolean))
                ].slice(0, 3)
            };
        });
        patterns.sort((a, b)=>Number(b.pattern) - Number(a.pattern) || Number(a.positive) - Number(b.positive) || b.count - a.count || a.kind.localeCompare(b.kind));
        const recent = rated.filter((r)=>now.getTime() - r.at.getTime() <= TREND_DAYS * DAY).map((r)=>r.rating);
        const older = rated.filter((r)=>now.getTime() - r.at.getTime() > TREND_DAYS * DAY).map((r)=>r.rating);
        const falling = recent.length >= 2 && older.length >= 2 && mean(recent) <= mean(older) - 0.5;
        const out = removed.filter((r)=>r.code === code && now.getTime() - r.at.getTime() <= REMOVED_DAYS * DAY).length;
        const trend = out >= 2 ? "byttes_ut" : falling ? "faller" : "";
        return {
            code,
            score,
            ratings: rated.length,
            trend,
            patterns,
            bands: bandScores(rated)
        };
    });
}
function patternText(p) {
    const label = OBSERVATION_KINDS[p.kind]?.label ?? p.kind;
    const who = [
        `${p.sessions} ${p.sessions === 1 ? "økt" : "økter"}`,
        `${p.trainers} ${p.trainers === 1 ? "trener" : "trenere"}`
    ].join(", ");
    return [
        `${label[0].toUpperCase()}${label.slice(1)}: ${who}`,
        OBSERVATION_PARTS[p.part] ?? "",
        p.context
    ].filter(Boolean).join(" · ");
}
const TREND_TEXT = {
    "": "",
    faller: "Vurderingene har falt de siste to månedene.",
    byttes_ut: "Trenerne har byttet ut øvelsen i opplegg fra KI flere ganger."
};
}),
"[project]/lib/plans/pitch-schedule.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Faste baner per ukedag. Banefordelingen kommer to ganger i året, og da får
 * hver treningsdag de samme banene til neste fordeling. En rad sier «disse
 * banene på mandager fra denne datoen», med en valgfri sluttdato (når neste
 * fordeling ventes). Den nyeste raden som har startet gjelder; etter
 * sluttdatoen har dagen ingen fast bane før nye legges inn. En enkelt
 * trening kan overstyres (event_pitches).
 *
 * Datoer er «YYYY-MM-DD» i norsk tid. Ukedag 1 = mandag … 7 = søndag.
 */ __turbopack_context__.s([
    "DATE_RE",
    ()=>DATE_RE,
    "EXPIRY_WARN_DAYS",
    ()=>EXPIRY_WARN_DAYS,
    "MAX_PITCHES",
    ()=>MAX_PITCHES,
    "WEEKDAY_NAMES",
    ()=>WEEKDAY_NAMES,
    "WEEKDAY_PLURAL",
    ()=>WEEKDAY_PLURAL,
    "addDays",
    ()=>addDays,
    "currentRows",
    ()=>currentRows,
    "dateText",
    ()=>dateText,
    "endedText",
    ()=>endedText,
    "endingSoon",
    ()=>endingSoon,
    "endingText",
    ()=>endingText,
    "eventPitches",
    ()=>eventPitches,
    "fixedOn",
    ()=>fixedOn,
    "isDateKey",
    ()=>isDateKey,
    "isoWeekday",
    ()=>isoWeekday,
    "listText",
    ()=>listText,
    "numericDate",
    ()=>numericDate,
    "periodText",
    ()=>periodText,
    "rowStatus",
    ()=>rowStatus,
    "samePitches",
    ()=>samePitches,
    "spanText",
    ()=>spanText,
    "validateWeekdayPitches",
    ()=>validateWeekdayPitches
]);
const WEEKDAY_NAMES = [
    "mandag",
    "tirsdag",
    "onsdag",
    "torsdag",
    "fredag",
    "lørdag",
    "søndag"
];
const WEEKDAY_PLURAL = [
    "mandager",
    "tirsdager",
    "onsdager",
    "torsdager",
    "fredager",
    "lørdager",
    "søndager"
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isDateKey(s) {
    if (!DATE_RE.test(s)) return false;
    const d = new Date(`${s}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function isoWeekday(dateKey) {
    const wd = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return wd === 0 ? 7 : wd;
}
function addDays(dateKey, days) {
    const d = new Date(`${dateKey}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function fixedOn(rows, dateKey) {
    const wd = isoWeekday(dateKey);
    let best = null;
    for (const r of rows){
        if (r.weekday !== wd || r.valid_from > dateKey) continue;
        if (!best || r.valid_from > best.valid_from) best = r;
    }
    if (!best) return {
        state: "none"
    };
    if (best.valid_to && best.valid_to < dateKey) return {
        state: "expired",
        row: best
    };
    return {
        state: "fixed",
        row: best
    };
}
function eventPitches(rows, override, dateKey) {
    const f = dateKey ? fixedOn(rows, dateKey) : {
        state: "none"
    };
    const fixed = f.state === "fixed" ? f.row : null;
    if (override?.length) return {
        ids: override,
        source: "event",
        expired: null,
        fixed
    };
    if (fixed) return {
        ids: fixed.pitch_ids,
        source: "fixed",
        expired: null,
        fixed
    };
    return {
        ids: [],
        source: "none",
        expired: f.state === "expired" ? f.row : null,
        fixed: null
    };
}
function samePitches(a, b) {
    const x = new Set(a);
    return x.size === new Set(b).size && b.every((id)=>x.has(id));
}
const EXPIRY_WARN_DAYS = 21;
function endingSoon(rows, today, days = EXPIRY_WARN_DAYS) {
    const limit = addDays(today, days);
    const out = [];
    for(let wd = 1; wd <= 7; wd++){
        const mine = rows.filter((r)=>r.weekday === wd);
        // The row in force today, or the next one to start.
        const now = mine.filter((r)=>r.valid_from <= today).sort((a, b)=>b.valid_from.localeCompare(a.valid_from))[0];
        if (!now?.valid_to || now.valid_to < today || now.valid_to > limit) continue;
        if (mine.some((r)=>r.valid_from > now.valid_from && r.valid_from <= addDays(now.valid_to, 1))) continue;
        out.push(now);
    }
    return out.sort((a, b)=>a.valid_to.localeCompare(b.valid_to));
}
function currentRows(rows, today) {
    const out = [];
    for(let wd = 1; wd <= 7; wd++){
        const mine = rows.filter((r)=>r.weekday === wd).sort((a, b)=>a.valid_from.localeCompare(b.valid_from));
        const started = mine.filter((r)=>r.valid_from <= today);
        if (started.length) out.push(started[started.length - 1]);
        out.push(...mine.filter((r)=>r.valid_from > today));
    }
    return out;
}
const MAX_PITCHES = 12;
function validateWeekdayPitches(input) {
    if (!isDateKey(input.from)) return "Velg dato banene gjelder fra.";
    if (input.to !== null && !isDateKey(input.to)) return "Ugyldig sluttdato.";
    if (input.to !== null && input.to < input.from) return "Sluttdatoen må være etter startdatoen.";
    if (!input.days.length) return "Velg minst én ukedag med baner.";
    const seen = new Set();
    for (const d of input.days){
        if (!Number.isInteger(d.weekday) || d.weekday < 1 || d.weekday > 7 || seen.has(d.weekday)) return "Ugyldig ukedag.";
        seen.add(d.weekday);
        if (!d.pitch_ids.length) return `Velg minst én bane for ${WEEKDAY_PLURAL[d.weekday - 1]}.`;
        if (d.pitch_ids.length > MAX_PITCHES) return `Velg maks ${MAX_PITCHES} baner per dag.`;
    }
    return null;
}
// Text ---------------------------------------------------------------------------------------
const MONTHS = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "des"
];
function dateText(key, today) {
    const [y, m, d] = key.split("-").map(Number);
    return `${d}. ${MONTHS[m - 1]}${key.slice(0, 4) !== today.slice(0, 4) ? ` ${y}` : ""}`;
}
function listText(items) {
    return items.length < 2 ? items[0] ?? "" : `${items.slice(0, -1).join(", ")} og ${items.at(-1)}`;
}
function rowStatus(r, today, ending) {
    if (r.valid_from > today) return "coming";
    if (r.valid_to && r.valid_to < today) return "ended";
    return ending.some((x)=>x.id === r.id) ? "ending" : "now";
}
function periodText(r, today) {
    const from = dateText(r.valid_from, today);
    if (!r.valid_to) return `Fra ${from} til neste endring`;
    const to = dateText(r.valid_to, today);
    return r.valid_to < today ? `${from}–${to}` : `Fra ${from} til og med ${to}`;
}
function endingText(rows, today) {
    if (!rows.length) return null;
    const byDate = new Map();
    for (const r of rows)byDate.set(r.valid_to, [
        ...byDate.get(r.valid_to) ?? [],
        WEEKDAY_PLURAL[r.weekday - 1]
    ]);
    return [
        ...byDate
    ].map(([to, days])=>`Faste baner for ${listText(days)} slutter ${to === today ? "i dag" : dateText(to, today)}.`).join(" ");
}
function endedText(rows, today) {
    const byDate = new Map();
    for (const r of [
        ...rows
    ].sort((a, b)=>a.weekday - b.weekday))byDate.set(r.valid_to, [
        ...byDate.get(r.valid_to) ?? [],
        WEEKDAY_PLURAL[r.weekday - 1]
    ]);
    const parts = [
        ...byDate
    ].map(([to, days])=>`${listText(days)} ${to < today ? "sluttet" : "slutter"} ${dateText(to, today)}`);
    return `de faste banene for ${listText(parts)}.`;
}
function numericDate(key) {
    const [y, m, d] = key.split("-");
    return `${d}.${m}.${y.slice(2)}`;
}
function spanText(r) {
    return r.valid_to ? `${numericDate(r.valid_from)}–${numericDate(r.valid_to)}` : `fra ${numericDate(r.valid_from)}`;
}
}),
"[project]/lib/plans/plan.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CATEGORIES",
    ()=>CATEGORIES,
    "CODE_RE",
    ()=>CODE_RE,
    "EXERCISE_STATUSES",
    ()=>EXERCISE_STATUSES,
    "MONTHS",
    ()=>MONTHS,
    "PlanError",
    ()=>PlanError,
    "SIMILARITY_THRESHOLD",
    ()=>SIMILARITY_THRESHOLD,
    "TOO_SIMILAR",
    ()=>TOO_SIMILAR,
    "bankCandidates",
    ()=>bankCandidates,
    "buildPlan",
    ()=>buildPlan,
    "categoryKey",
    ()=>categoryKey,
    "defaultSettings",
    ()=>defaultSettings,
    "exerciseCode",
    ()=>exerciseCode,
    "exerciseFromBank",
    ()=>exerciseFromBank,
    "pitchFacts",
    ()=>pitchFacts,
    "pitchGroups",
    ()=>pitchGroups,
    "pitchIds",
    ()=>pitchIds,
    "pitchLabel",
    ()=>pitchLabel,
    "pitchText",
    ()=>pitchText,
    "pitchTree",
    ()=>pitchTree,
    "planJson",
    ()=>planJson,
    "schedule",
    ()=>schedule,
    "settingsFromPlan",
    ()=>settingsFromPlan,
    "similarExercises",
    ()=>similarExercises,
    "similarity",
    ()=>similarity,
    "sourceText",
    ()=>sourceText,
    "textLines",
    ()=>textLines,
    "tooSimilar",
    ()=>tooSimilar,
    "tooSimilarText",
    ()=>tooSimilarText,
    "txt",
    ()=>txt,
    "validateExercise",
    ()=>validateExercise,
    "validateNff",
    ()=>validateNff,
    "validatePlan",
    ()=>validatePlan,
    "validateSeason",
    ()=>validateSeason,
    "validateTeamSettings",
    ()=>validateTeamSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sensitive.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/drawing.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/bands.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/fagplan.ts [instrumentation] (ecmascript)");
;
;
;
;
class PlanError extends Error {
}
const CATEGORIES = {
    oppvarming: "Oppvarming",
    ballmestring: "Ballmestring",
    pasning_mottak: "Pasning og mottak",
    vending: "Vending",
    avslutning: "Avslutning",
    angrep: "Angrep",
    forsvar: "Forsvar",
    smaaspill: "Småspill",
    annet: "Annet"
};
const EXERCISE_STATUSES = {
    active: "Aktiv",
    candidate: "Kandidat",
    archived: "Arkivert"
};
const TEXT_LISTS = [
    "organisering",
    "gjennomforing",
    "tilpasning",
    "laeringsmomenter",
    "sporsmal"
];
const LIST_LABEL = {
    organisering: "Organisering",
    gjennomforing: "Gjennomføring",
    tilpasning: "Tilpasning",
    laeringsmomenter: "Læringsmomenter",
    sporsmal: "Spørsmål"
};
const txt = (x)=>x === null || x === undefined ? "" : String(x).trim();
function str(x, what, max, required = false) {
    const t = txt(x);
    if (required && !t) throw new PlanError(`${what} mangler.`);
    if (t.length > max) throw new PlanError(`${what} kan ha maks ${max} tegn.`);
    return t;
}
function strs(x, what, maxItems = 12, maxChars = 400) {
    const list = (Array.isArray(x) ? x : []).map(txt).filter(Boolean);
    if (list.length > maxItems) throw new PlanError(`${what} kan ha maks ${maxItems} punkter.`);
    if (list.some((t)=>t.length > maxChars)) throw new PlanError(`Et punkt i ${what.toLowerCase()} kan ha maks ${maxChars} tegn.`);
    return list;
}
function int(x, what, lo, hi, fallback) {
    if (x === null || x === undefined || x === "") return fallback;
    const v = Number(x);
    if (!Number.isInteger(v) || v < lo || v > hi) throw new PlanError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
    return v;
}
function exerciseCode(name, taken = []) {
    let x = txt(name).toLowerCase().replace(/æ/g, "ae");
    x = x.replace(/[øöó]/g, "o").replace(/[åáàä]/g, "a").replace(/[éè]/g, "e").replace(/ü/g, "u");
    x = x.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
    if (!x) x = "ovelse";
    let code = x;
    for(let i = 2; taken.includes(code); i++)code = `${x}-${i}`;
    return code;
}
const CODE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
function validatePlan(input) {
    let p = input;
    if (typeof p === "string") {
        try {
            p = JSON.parse(p);
        } catch  {
            throw new PlanError("Opplegget er ikke gyldig JSON.");
        }
    }
    if (!p || typeof p !== "object") throw new PlanError("Opplegget må være et JSON-objekt.");
    const o = p;
    const ex = Array.isArray(o.ovelser) ? o.ovelser : [];
    if (ex.length < 1 || ex.length > 6) throw new PlanError("Et opplegg må ha 1 til 6 øvelser.");
    const tp = o.tidsplan ?? {};
    const fokus = o.fokus ?? {};
    const stikkord = (Array.isArray(o.stikkord) ? o.stikkord : []).map((s)=>({
            tittel: str(s?.tittel, "Et stikkord", 60, true),
            tekst: str(s?.tekst, "Stikkordteksten", 160)
        }));
    if (stikkord.length > 4) throw new PlanError("Maks 4 stikkord.");
    const grupper = int(tp.stasjoner?.grupper, "Antall grupper", 1, 6, 1);
    if (grupper > 1 && grupper !== ex.length) {
        throw new PlanError(`Med ${grupper} grupper som roterer må opplegget ha ${grupper} øvelser (én per stasjon).`);
    }
    return {
        versjon: 1,
        tittel: str(o.tittel, "Tittelen", 80, true),
        undertittel: str(o.undertittel, "Undertittelen", 160),
        tema: str(o.tema, "Temaet", 80),
        fokus: {
            forsvar: str(fokus.forsvar, "Fokus i forsvar", 300),
            angrep: str(fokus.angrep, "Fokus i angrep", 300)
        },
        stikkord,
        stikkord_merknad: str(o.stikkord_merknad, "Merknaden til stikkordene", 300),
        tidsplan: {
            oppvarming: {
                minutter: int(tp.oppvarming?.minutter, "Oppvarmingen", 0, 60, 0),
                tekst: str(tp.oppvarming?.tekst, "Oppvarmingsteksten", 200),
                ...tp.oppvarming?.ovelse ? {
                    ovelse: validatePlanExercise(tp.oppvarming.ovelse, "Oppvarmingsøvelsen: ")
                } : {}
            },
            stasjoner: {
                minutter: int(tp.stasjoner?.minutter, "Tid per øvelse", 1, 90, 15),
                bytte: int(tp.stasjoner?.bytte, "Byttetiden", 0, 10, 0),
                grupper
            },
            avslutning: {
                minutter: int(tp.avslutning?.minutter, "Avslutningen", 0, 60, 0),
                tekst: str(tp.avslutning?.tekst, "Avslutningsteksten", 200)
            },
            merknad: str(tp.merknad, "Merknaden til tidsplanen", 500)
        },
        avslutning_sporsmal: strs(o.avslutning_sporsmal, "Spørsmål til avslutningen", 6, 200),
        kilde: str(o.kilde, "Kildelinjen", 500),
        ovelser: ex.map((raw, i)=>validatePlanExercise(raw, `Øvelse ${i + 1}: `))
    };
}
/** Check one exercise of a plan; `w` starts every error message («Øvelse 2: »). */ function validatePlanExercise(raw, w) {
    const e = raw ?? {};
    const navn = str(e.navn, `${w}Navnet`, 80, true);
    const nff = str(e.nff_url, `${w}Lenken`, 500);
    if (nff && !/^https:\/\/\S+$/.test(nff)) throw new PlanError(`${w}Lenken må starte med https://.`);
    const kilde = txt(e.kilde || "ny");
    if (![
        "bank",
        "justert",
        "ny"
    ].includes(kilde)) throw new PlanError(`${w}Kilden må være bank, justert eller ny.`);
    let tegning = null;
    try {
        tegning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateDrawing"])(e.tegning ?? null);
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["DrawingError"]) throw new PlanError(w + err.message);
        throw err;
    }
    const lists = Object.fromEntries(TEXT_LISTS.map((k)=>[
            k,
            strs(e[k], `${w}${LIST_LABEL[k]}`)
        ]));
    return {
        kode: str(e.kode, `${w}Koden`, 60) || exerciseCode(navn),
        navn,
        kategori: str(e.kategori, `${w}Kategorien`, 60),
        fokus: str(e.fokus, `${w}Fokus`, 300),
        ...lists,
        enklere: str(e.enklere, `${w}Enklere`, 400),
        vanskeligere: str(e.vanskeligere, `${w}Vanskeligere`, 400),
        nff_url: nff,
        kilde,
        basert_pa: str(e.basert_pa, `${w}basert_pa`, 60),
        naermeste_kode: str(e.naermeste_kode, `${w}naermeste_kode`, 60),
        hvorfor_ny: str(e.hvorfor_ny, `${w}hvorfor_ny`, 300),
        tegning,
        ...planNff(e)
    };
}
/** NFF activity and tags on a plan exercise, only when present and known. */ function planNff(e) {
    const out = {};
    const a = txt(e.aktivitet);
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["AKTIVITETER"].some((x)=>x.key === a)) out.aktivitet = a;
    const tags = Array.isArray(e.nff_tags) ? [
        ...new Set(e.nff_tags.map(txt))
    ].filter(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isKnownTag"]).slice(0, 20) : [];
    if (tags.length) out.nff_tags = tags;
    return out;
}
function planJson(p) {
    return JSON.stringify({
        ...p,
        ovelser: p.ovelser.map((e)=>({
                ...e,
                tegning: e.tegning ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["compactDrawing"])(e.tegning) : null
            }))
    });
}
function schedule(p, groupNames = []) {
    const tp = p.tidsplan;
    const n = p.ovelser.length;
    const g = tp.stasjoner.grupper;
    const span = (a, b)=>`${a}–${b}`;
    const rows = [];
    let t = 0;
    if (tp.oppvarming.minutter > 0) {
        const tekst = tp.oppvarming.ovelse ? `Felles oppvarming: ${tp.oppvarming.ovelse.navn}` : tp.oppvarming.tekst || "Felles oppvarming";
        rows.push({
            tid: span(t, t + tp.oppvarming.minutter),
            felles: true,
            tekst
        });
        t += tp.oppvarming.minutter;
    }
    for(let k = 1; k <= n; k++){
        if (k > 1) t += tp.stasjoner.bytte;
        const cells = g > 1 ? Array.from({
            length: g
        }, (_, j)=>`Øvelse ${(j + k - 1) % n + 1}`) : [
            `Øvelse ${k}: ${p.ovelser[k - 1].navn}`
        ];
        rows.push({
            tid: span(t, t + tp.stasjoner.minutter),
            felles: false,
            celler: cells
        });
        t += tp.stasjoner.minutter;
    }
    if (tp.avslutning.minutter > 0) {
        rows.push({
            tid: span(t, t + tp.avslutning.minutter),
            felles: true,
            tekst: tp.avslutning.tekst || "Felles avslutning"
        });
        t += tp.avslutning.minutter;
    }
    const cols = g > 1 && groupNames.length === g ? groupNames : g > 1 ? Array.from({
        length: g
    }, (_, j)=>`Gruppe ${j + 1}`) : [
        "Alle"
    ];
    return {
        columns: [
            "Tid",
            ...cols
        ],
        rows,
        total: t
    };
}
function textLines(x) {
    return txt(x).split("\n").map((l)=>l.replace(/^\s*([-•*]|\d+[.)])\s+/, "").trim()).filter(Boolean);
}
function exerciseFromBank(b) {
    return {
        kode: b.code,
        navn: b.name,
        kategori: CATEGORIES[b.category] ?? b.category,
        fokus: "",
        organisering: textLines(b.organisation),
        gjennomforing: textLines(b.execution),
        tilpasning: [],
        laeringsmomenter: textLines(b.learning_points),
        sporsmal: textLines(b.questions),
        enklere: b.easier,
        vanskeligere: b.harder,
        nff_url: b.nff_url,
        kilde: "bank",
        basert_pa: "",
        naermeste_kode: "",
        hvorfor_ny: "",
        tegning: b.drawing
    };
}
const categoryKey = (label)=>Object.keys(CATEGORIES).find((k)=>CATEGORIES[k].toLowerCase() === txt(label).toLowerCase() || k === txt(label)) ?? "annet";
function defaultSettings(theme = "") {
    return {
        tittel: theme || "Treningsøkt",
        tema: theme,
        undertittel: "",
        forsvar: "",
        angrep: "",
        stikkord: [],
        oppvarming: 10,
        oppvarming_tekst: "Felles oppvarming",
        oppvarming_ovelse: "",
        stasjon: 15,
        bytte: 2,
        rotasjon: true,
        avslutning: 8,
        avslutning_tekst: "Felles avslutning",
        sporsmal: "",
        merknad: ""
    };
}
function settingsFromPlan(p) {
    const tp = p.tidsplan;
    return {
        tittel: p.tittel,
        tema: p.tema,
        undertittel: p.undertittel,
        forsvar: p.fokus.forsvar,
        angrep: p.fokus.angrep,
        stikkord: p.stikkord,
        oppvarming: tp.oppvarming.minutter,
        oppvarming_tekst: tp.oppvarming.tekst,
        oppvarming_ovelse: tp.oppvarming.ovelse ? "keep" : "",
        stasjon: tp.stasjoner.minutter,
        bytte: tp.stasjoner.bytte,
        rotasjon: tp.stasjoner.grupper > 1,
        avslutning: tp.avslutning.minutter,
        avslutning_tekst: tp.avslutning.tekst,
        sporsmal: p.avslutning_sporsmal.join("\n"),
        merknad: tp.merknad
    };
}
function buildPlan(ex, s, keep = {}, warmup = null) {
    if (!ex.length) throw new PlanError("Velg minst én øvelse.");
    const texts = [
        s.tittel,
        s.tema,
        s.forsvar,
        s.angrep,
        s.sporsmal,
        s.merknad,
        s.oppvarming_tekst,
        s.avslutning_tekst,
        ...s.stikkord.flatMap((k)=>[
                k.tittel,
                k.tekst
            ])
    ];
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(...texts)) throw new PlanError("Opplegget skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    const n = ex.length;
    const rot = s.rotasjon && n > 1;
    const p = validatePlan({
        ...keep,
        tittel: s.tittel,
        undertittel: s.undertittel,
        tema: s.tema,
        fokus: {
            forsvar: s.forsvar,
            angrep: s.angrep
        },
        stikkord: s.stikkord.filter((k)=>txt(k.tittel)),
        tidsplan: {
            oppvarming: {
                minutter: s.oppvarming,
                tekst: s.oppvarming_tekst,
                ...warmup ? {
                    ovelse: warmup
                } : {}
            },
            stasjoner: {
                minutter: s.stasjon,
                bytte: n > 1 ? s.bytte : 0,
                grupper: rot ? n : 1
            },
            avslutning: {
                minutter: s.avslutning,
                tekst: s.avslutning_tekst
            },
            merknad: s.merknad
        },
        avslutning_sporsmal: textLines(s.sporsmal),
        ovelser: ex
    });
    if (!p.undertittel) {
        const total = schedule(p).total;
        p.undertittel = `${rot ? `${n} stasjoner, ${n} grupper` : `${n} ${n === 1 ? "øvelse" : "øvelser"}`} · ca. ${total} min`;
    }
    return p;
}
function validateNff(e) {
    const raw = Array.isArray(e.bands) ? e.bands.map(txt) : [];
    if (raw.some((b)=>!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BAND_KEYS"].includes(b))) throw new PlanError("Ukjent aldersbånd.");
    const bands = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BAND_KEYS"].filter((b)=>raw.includes(b));
    const nff_activity = txt(e.nff_activity);
    if (nff_activity && !__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["AKTIVITETER"].some((a)=>a.key === nff_activity)) throw new PlanError("Ukjent aktivitetskategori.");
    const tags = [
        ...new Set((Array.isArray(e.nff_tags) ? e.nff_tags : []).map(txt))
    ].filter((t)=>{
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isKnownTag"])(t)) return false;
        const lp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["learningPoint"])(t);
        return !lp || !bands.length || bands.includes(lp.band);
    });
    if (tags.length > 60) throw new PlanError("En øvelse kan ha maks 60 NFF-tagger.");
    return {
        bands,
        nff_activity,
        nff_tags: tags
    };
}
const TEXT_MAX = {
    area: 60,
    organisation: 2000,
    execution: 2000,
    learning_points: 2000,
    questions: 2000,
    easier: 1000,
    harder: 1000,
    nff_url: 500
};
function intOrNull(x, what, lo, hi) {
    const t = txt(x);
    if (!t) return null;
    if (!/^\d+$/.test(t) || Number(t) < lo || Number(t) > hi) throw new PlanError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
    return Number(t);
}
function validateExercise(e) {
    const name = txt(e.name).replace(/\s+/g, " ");
    if (!name || name.length > 80) throw new PlanError("Navnet må ha mellom 1 og 80 tegn.");
    const category = txt(e.category);
    if (!(category in CATEGORIES)) throw new PlanError("Velg en kategori.");
    const themes = [];
    for (const t of (e.themes ?? []).map((x)=>txt(x).replace(/\s+/g, " ")).filter(Boolean)){
        if (!themes.some((x)=>x.toLowerCase() === t.toLowerCase())) themes.push(t);
    }
    if (themes.length > 10) throw new PlanError("En øvelse kan ha maks 10 temaer.");
    if (themes.some((t)=>t.length > 40)) throw new PlanError("Et tema kan ha maks 40 tegn.");
    const min = intOrNull(e.min_players, "Minste antall spillere", 1, 60);
    const max = intOrNull(e.max_players, "Største antall spillere", 1, 60);
    if (min !== null && max !== null && max < min) throw new PlanError("Største antall spillere kan ikke være mindre enn minste antall.");
    const texts = Object.fromEntries(Object.entries(TEXT_MAX).map(([k, m])=>{
        const v = txt(e[k]);
        if (v.length > m) throw new PlanError(`Feltet «${k}» kan ha maks ${m} tegn.`);
        return [
            k,
            v
        ];
    }));
    if (texts.nff_url && !/^https:\/\/\S+$/.test(texts.nff_url)) throw new PlanError("Lenken må starte med https://.");
    let drawing = null;
    try {
        drawing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateDrawing"])(e.drawing ?? null);
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["DrawingError"]) throw new PlanError(`Tegning: ${err.message}`);
        throw err;
    }
    const status = txt(e.status);
    if (status && !(status in EXERCISE_STATUSES)) throw new PlanError("Ugyldig status.");
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(name, ...Object.values(texts))) throw new PlanError("Øvelsen skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    return {
        name,
        category,
        themes,
        min_players: min,
        max_players: max,
        duration_minutes: intOrNull(e.duration_minutes, "Tid", 1, 120),
        ...texts,
        drawing,
        status: status || null,
        ...validateNff(e)
    };
}
const MONTHS = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember"
];
function validateSeason(year, themes, descriptions) {
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new PlanError("Ugyldig år.");
    const out = [];
    for(let i = 0; i < 12; i++){
        const t = txt(themes[i]).replace(/\s+/g, " ");
        const d = txt(descriptions[i]);
        if (t.length > 80) throw new PlanError("Et tema kan ha maks 80 tegn.");
        if (d.length > 500) throw new PlanError("En beskrivelse kan ha maks 500 tegn.");
        if (!t && d) throw new PlanError(`Skriv et tema for ${MONTHS[i].toLowerCase()}, eller fjern beskrivelsen.`);
        if (t) out.push({
            month: i + 1,
            theme: t,
            description: d
        });
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(...out.flatMap((x)=>[
            x.theme,
            x.description
        ]))) {
        throw new PlanError("Årshjulet skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    }
    return out;
}
function pitchIds(x) {
    const list = Array.isArray(x) ? x : txt(x).split(",");
    const ids = [
        ...new Set(list.map(txt).filter(Boolean))
    ];
    if (ids.length > 50 || ids.some((t)=>!/^\d{1,9}$/.test(t))) throw new PlanError("Ukjent bane.");
    return ids.map(Number);
}
function genderOrNull(x) {
    const g = txt(x);
    if (!g) return null;
    if (!(g in __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["GENDERS"])) throw new PlanError("Ukjent kjønn.");
    return g;
}
function validateTeamSettings(s) {
    const out = {
        age_group: txt(s.age_group),
        birth_year: intOrNull(s.birth_year, "Fødselsår", __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BIRTH_YEAR_MIN"], __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BIRTH_YEAR_MAX"]),
        gender: genderOrNull(s.gender),
        session_minutes: intOrNull(s.session_minutes, "Øktlengde", 15, 240),
        pitch_ids: pitchIds(s.pitch_ids),
        pitch: txt(s.pitch),
        equipment: txt(s.equipment)
    };
    const max = {
        age_group: 40,
        pitch: 200,
        equipment: 1000
    };
    for (const [k, m] of Object.entries(max)){
        if (out[k].length > m) throw new PlanError(`Feltet «${k}» kan ha maks ${m} tegn.`);
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(out.age_group, out.pitch, out.equipment)) {
        throw new PlanError("Laget skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    }
    return out;
}
function pitchFacts(p) {
    const size = p.length_m && p.width_m ? `${p.length_m} × ${p.width_m} m` : "";
    const light = p.lighting ? `lys ${p.lighting}` : "uten lys";
    return [
        p.pitch_type,
        p.surface,
        size,
        light
    ].filter(Boolean).join(" · ");
}
function pitchLabel(p) {
    return `${p.facility}, ${p.name} (${pitchFacts(p)})`;
}
function pitchText(pitches, note) {
    return [
        pitches.map(pitchLabel).join("; "),
        txt(note)
    ].filter(Boolean).join(". ");
}
function pitchGroups(pitches, chosen = []) {
    const groups = [];
    for (const { pitch: p, depth } of pitchTree(pitches)){
        if (depth === 0) groups.push({
            title: p.name,
            pitches: []
        });
        if (p.retired && !chosen.includes(p.id)) continue;
        groups.at(-1)?.pitches.push({
            id: p.id,
            depth,
            name: p.name,
            facts: pitchFacts(p)
        });
    }
    return groups.filter((g)=>g.pitches.length);
}
function pitchTree(pitches) {
    const byId = new Map(pitches.map((p)=>[
            p.id,
            p
        ]));
    const depth = (p, seen = 0)=>{
        const parent = p.parent_id === null ? undefined : byId.get(p.parent_id);
        return parent && seen < 10 ? 1 + depth(parent, seen + 1) : 0;
    };
    return pitches.map((pitch)=>({
            pitch,
            depth: depth(pitch)
        }));
}
const SIMILARITY_THRESHOLD = 0.6;
const TOO_SIMILAR = 0.75;
const STOP = new Set([
    "og",
    "med",
    "som",
    "til",
    "den",
    "det",
    "der",
    "for",
    "fra",
    "har",
    "ikke",
    "kan",
    "men",
    "når",
    "seg",
    "sin",
    "skal",
    "slik",
    "the",
    "eller",
    "etter",
    "før",
    "hver",
    "inn",
    "mot",
    "opp",
    "over",
    "også",
    "alle",
    "blir",
    "dem",
    "deg",
    "din",
    "dere",
    "han",
    "hun",
    "meg",
    "mer",
    "noe",
    "nye",
    "ved",
    "vil",
    "være",
    "spiller",
    "spillere",
    "ballen",
    "ball"
]);
function words(...x) {
    const t = x.flat().map((v)=>Array.isArray(v) ? v.join(" ") : txt(v)).join(" ").toLowerCase();
    return new Set(t.split(/[^\p{L}\p{N}]+/u).filter((w)=>w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)));
}
function shape(d) {
    if (!d) return null;
    const s = d.skisser[0];
    return {
        players: s.objekter.filter((o)=>o.type === "spiller").length,
        area: s.bane.bredde * s.bane.lengde
    };
}
const norm = (x)=>x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function similarExercises(x, bank, except = "") {
    const w1 = words(x.name, x.organisation, x.execution);
    const sh1 = shape(x.drawing);
    const themes = new Set(x.themes.map((t)=>t.toLowerCase().trim()).filter(Boolean));
    const ratio = (a, b)=>a <= 0 || b <= 0 ? Number(a === b) : Math.min(a, b) / Math.max(a, b);
    return bank.filter((b)=>b.status !== "archived" && b.code !== except).map((b)=>{
        if (norm(b.name) && norm(b.name) === norm(x.name)) return {
            code: b.code,
            name: b.name,
            score: 1
        };
        const w2 = words(b.name, b.organisation, b.execution);
        const union = new Set([
            ...w1,
            ...w2
        ]);
        const inter = [
            ...w1
        ].filter((w)=>w2.has(w)).length;
        const wordsScore = union.size ? inter / union.size : 0;
        const cat = Number(x.category === b.category);
        const th = Number(b.themes.some((t)=>themes.has(t.toLowerCase().trim())));
        const sh2 = shape(b.drawing);
        const shp = !sh1 || !sh2 ? 0.5 : (ratio(sh1.players, sh2.players) + ratio(sh1.area, sh2.area)) / 2;
        return {
            code: b.code,
            name: b.name,
            score: Math.round((0.4 * wordsScore + 0.2 * cat + 0.2 * th + 0.2 * shp) * 100) / 100
        };
    }).sort((a, b)=>b.score - a.score);
}
function similarity(e, bank, theme = "") {
    return similarExercises({
        name: e.navn,
        category: categoryKey(e.kategori),
        themes: theme ? [
            theme
        ] : [],
        organisation: e.organisering,
        execution: e.gjennomforing,
        drawing: e.tegning
    }, bank);
}
function tooSimilar(x, bank, except = "") {
    const top = similarExercises(x, bank, except)[0];
    return top && top.score >= TOO_SIMILAR ? top : null;
}
function tooSimilarText(m) {
    return `Øvelsen ligner for mye på «${m.name}», som allerede er i øvelsesbanken (${Math.round(m.score * 100)} % lik). Juster heller «${m.name}», eller lag en øvelse som er tydelig annerledes.`;
}
function bankCandidates(p, bank) {
    const codes = new Set(bank.map((b)=>b.code));
    return p.ovelser.flatMap((e, i)=>{
        if (e.kilde === "bank" || codes.has(e.kode)) return [];
        const top = e.kilde === "ny" ? similarity(e, bank, p.tema)[0] : undefined;
        const match = top && top.score >= SIMILARITY_THRESHOLD ? top : null;
        const blocked = !!match && match.score >= TOO_SIMILAR;
        return [
            {
                index: i + 1,
                kode: e.kode,
                navn: e.navn,
                kilde: e.kilde,
                basert_pa: e.basert_pa,
                match,
                blocked,
                default: e.kilde === "ny" && !match ? "save" : "skip"
            }
        ];
    });
}
function sourceText(url) {
    if (!url) return "";
    let host = "";
    try {
        host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch  {
        return "Inspirert av øvelsen på:";
    }
    const nff = host === "tiim.no" || host === "fotball.no" || host.endsWith(".fotball.no");
    return `Inspirert av øvelsen på ${host}${nff ? " (Norges Fotballforbund)" : ""}:`;
}
}),
"[project]/lib/sensitive.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clean",
    ()=>clean,
    "commentProblem",
    ()=>commentProblem,
    "isSensitive",
    ()=>isSensitive,
    "memberNames",
    ()=>memberNames,
    "namesFound",
    ()=>namesFound,
    "namesProblem",
    ()=>namesProblem,
    "redactNames",
    ()=>redactNames,
    "storedNamesProblem",
    ()=>storedNamesProblem,
    "tagProblem",
    ()=>tagProblem
]);
/**
 * Tags, comments and free text must not hold health or other sensitive
 * information (GDPR art. 9), nor contact details. The app refuses obvious
 * words; the list is a help, not a guarantee. Matched at the start of a
 * word, case-insensitive: "skad" catches "skadet", "skade", "skadeavbrekk".
 */ const SENSITIVE = [
    /(?<![\p{L}\p{N}])skad/iu,
    /(?<![\p{L}\p{N}])syk(e|t|dom|dommen|meldt|emeldt)?(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])diagnos/iu,
    /(?<![\p{L}\p{N}])allergi/iu,
    /(?<![\p{L}\p{N}])astma/iu,
    /(?<![\p{L}\p{N}])adhd(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])autis/iu,
    /(?<![\p{L}\p{N}])epilep/iu,
    /(?<![\p{L}\p{N}])diabet/iu,
    /(?<![\p{L}\p{N}])medisin/iu,
    /(?<![\p{L}\p{N}])hjernerystelse/iu,
    /(?<![\p{L}\p{N}])brudd(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])brukket/iu,
    /(?<![\p{L}\p{N}])operer/iu,
    /(?<![\p{L}\p{N}])smert/iu,
    /(?<![\p{L}\p{N}])dysleksi/iu,
    /(?<![\p{L}\p{N}])spiseforstyrr/iu,
    /(?<![\p{L}\p{N}])angst/iu,
    /(?<![\p{L}\p{N}])depre/iu,
    /(?<![\p{L}\p{N}])psyk/iu,
    /(?<![\p{L}\p{N}])gravid/iu,
    /(?<![\p{L}\p{N}])fysioterap/iu,
    /(?<![\p{L}\p{N}])rehab/iu,
    /(?<![\p{L}\p{N}])sykehus/iu,
    /(?<![\p{L}\p{N}])barnevern/iu,
    /(?<![\p{L}\p{N}])relig/iu,
    /(?<![\p{L}\p{N}])etnisk/iu,
    /(?<![\p{L}\p{N}])funksjonshem/iu
];
function isSensitive(...texts) {
    const t = texts.filter(Boolean).join(" ");
    return !!t && SENSITIVE.some((re)=>re.test(t));
}
const clean = (x)=>typeof x === "string" ? x.trim().replace(/\s+/g, " ") : "";
function tagProblem(tag) {
    const t = clean(tag);
    if (!t) return "Skriv inn en tag.";
    if (t.length > 40) return "En tag kan ha maks 40 tegn.";
    if (isSensitive(t)) return "Tagger skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
    if (t.includes("@") || /\d[\d ]{6,}\d/.test(t)) return "Tagger skal ikke inneholde kontaktinformasjon.";
    return null;
}
function commentProblem(text, max = 2000) {
    const t = (text ?? "").trim();
    if (!t) return "Skriv en kommentar først.";
    if (t.length > max) return `En kommentar kan ha maks ${max} tegn.`;
    if (isSensitive(t)) return "Kommentarer skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
    return null;
}
// Names in free text. Names are never sent to KI, so text that goes there is
// checked against the team's member names. Full names are always caught; a
// first name alone only with at least 3 letters and when it is not a common word.
const COMMON = new Set([
    "per",
    "dag",
    "liv",
    "sol",
    "ask",
    "stein",
    "kai",
    "mai",
    "vår",
    "var",
    "tor",
    "rom",
    "lin",
    "even",
    "hans",
    "frank",
    "storm",
    "fred",
    "rune",
    "ulv",
    "ørn",
    "vill",
    "siv"
]);
function memberNames(members) {
    const out = new Set();
    for (const m of members){
        const full = `${m.firstName} ${m.lastName}`.trim();
        if (full.includes(" ")) out.add(full);
        for (const f of [
            m.firstName.trim(),
            ...m.firstName.split(/[\s-]+/)
        ]){
            if (f.length >= 3 && !COMMON.has(f.toLowerCase())) out.add(f);
        }
    }
    return [
        ...out
    ].filter(Boolean);
}
const esc = (s)=>s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function namesFound(text, names) {
    if (!text.trim() || !names.length) return [];
    return names.filter((n)=>new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "iu").test(text));
}
function namesProblem(text, names, reason = "Navn sendes ikke til KI") {
    const found = namesFound(text, names);
    if (!found.length) return null;
    return `Teksten nevner ${found.slice(0, 3).map((n)=>`«${n}»`).join(", ")}. ${reason}: skriv f.eks. «en av keeperne» i stedet.`;
}
function redactNames(text, names) {
    return [
        ...names
    ].sort((a, b)=>b.length - a.length).reduce((t, n)=>t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "giu"), "en spiller"), text);
}
function storedNamesProblem(texts, names) {
    for (const t of texts){
        const p = t ? namesProblem(t, names, "Navn lagres ikke i appen") : null;
        if (p) return p;
    }
    return null;
}
}),
"[project]/lib/spond/client.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SpondError",
    ()=>SpondError,
    "eventsSearchParams",
    ()=>eventsSearchParams,
    "realSpond",
    ()=>realSpond
]);
;
class SpondError extends Error {
    code;
    constructor(message, code = "http"){
        super(message), this.code = code;
        this.name = "SpondError";
    }
}
const BASE = "https://api.spond.com/core/v1/";
const USER_AGENT = "NymarkGruppeorganisering";
function formatTime(d) {
    return d ? d.toISOString().replace(/\.\d{3}Z$/, ".000Z") : undefined;
}
function eventsSearchParams(q) {
    const p = new URLSearchParams();
    p.set("max", String(q.max ?? 100));
    p.set("scheduled", q.includeScheduled ? "true" : "false");
    const add = (k, v)=>v && p.set(k, v);
    add("groupId", q.groupId);
    add("subGroupId", q.subgroupId);
    add("minStartTimestamp", formatTime(q.minStart));
    add("maxStartTimestamp", formatTime(q.maxStart));
    add("minEndTimestamp", formatTime(q.minEnd));
    add("maxEndTimestamp", formatTime(q.maxEnd));
    return p;
}
async function send(path, init) {
    const headers = new Headers(init.headers);
    headers.set("User-Agent", USER_AGENT);
    if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
    try {
        return await fetch(new URL(path, BASE), {
            ...init,
            headers,
            signal: AbortSignal.timeout(30_000),
            cache: "no-store"
        });
    } catch  {
        throw new SpondError("Fikk ikke kontakt med Spond. Prøv igjen om litt.", "network");
    }
}
async function getJson(path, token) {
    const res = await send(path, {
        method: "GET",
        token
    });
    if (res.status === 401) throw new SpondError("Økten i Spond er utløpt. Logg inn på nytt.", "expired");
    if (!res.ok) throw new SpondError(`Kall mot Spond feilet (HTTP ${res.status}). Prøv igjen om litt.`);
    return await res.json();
}
const realSpond = {
    async login (identifier, password) {
        // Spond takes an e-mail address or a mobile number (+4799999999) in `email`.
        const res = await send("auth2/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: identifier,
                password
            })
        });
        if ([
            400,
            401,
            403
        ].includes(res.status)) {
            throw new SpondError("Feil e-post, mobilnummer eller passord. Sjekk og prøv igjen.", "login");
        }
        if (!res.ok) throw new SpondError(`Innlogging mot Spond feilet (HTTP ${res.status}). Prøv igjen om litt.`);
        const body = await res.json();
        const token = body.accessToken?.token;
        if (!token) {
            // Not the expected shape; one cause is two-factor login. Only field names are reported.
            throw new SpondError(`Spond svarte uten tilgangstoken (feltene var: ${Object.keys(body).join(", ")}). ` + "Kontoen krever kanskje ekstra verifisering (tofaktor).", "login");
        }
        return {
            token,
            expiration: body.accessToken?.expiration ?? null
        };
    },
    profile: (token)=>getJson("profile", token),
    groups: (token)=>getJson("groups/", token),
    events: (token, q)=>getJson(`sponds/?${eventsSearchParams(q)}`, token)
};
}),
"[project]/lib/spond/mock.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEMO_ACCOUNTS",
    ()=>DEMO_ACCOUNTS,
    "DEMO_PASSWORD",
    ()=>DEMO_PASSWORD,
    "mockEvents",
    ()=>mockEvents,
    "mockSpond",
    ()=>mockSpond
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/format.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$spond$2f$client$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/spond/client.ts [instrumentation] (ecmascript)");
;
;
;
const DEMO_PASSWORD = "demo";
const DEMO_ACCOUNTS = [
    {
        email: "kjetil@demo.no",
        profileId: "P-KJETIL",
        note: "Hovedlagleder og superadmin"
    },
    {
        email: "ann@demo.no",
        profileId: "P-ANN",
        note: "Trener med app-tilgang og KI"
    },
    {
        email: "beate@demo.no",
        profileId: "P-BEATE",
        note: "Trener uten app-tilgang"
    },
    {
        email: "forelder@demo.no",
        profileId: "P-FORELDER",
        note: "Forelder uten trenerrolle"
    }
];
const PROFILES = {
    "P-KJETIL": {
        id: "P-KJETIL",
        firstName: "Kjetil",
        lastName: "Gramstad"
    },
    "P-ANN": {
        id: "P-ANN",
        firstName: "Ann Kristin",
        lastName: "Kvamme"
    },
    "P-BEATE": {
        id: "P-BEATE",
        firstName: "Beate",
        lastName: "Isaksen"
    },
    "P-PER": {
        id: "P-PER",
        firstName: "Per",
        lastName: "Olsen"
    },
    "P-LISE": {
        id: "P-LISE",
        firstName: "Lise",
        lastName: "Moen"
    },
    "P-TOM": {
        id: "P-TOM",
        firstName: "Tom",
        lastName: "Berg"
    },
    "P-FORELDER": {
        id: "P-FORELDER",
        firstName: "Hilde",
        lastName: "Nilsen"
    }
};
// Small deterministic random generator (mulberry32).
function rng(seed) {
    return ()=>{
        seed |= 0;
        seed = seed + 0x6d2b79f5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function hash(s) {
    let h = 2166136261;
    for(let i = 0; i < s.length; i++)h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}
const BOYS = [
    "Aksel",
    "Emil",
    "Filip",
    "Henrik",
    "Isak",
    "Jakob",
    "Johannes",
    "Kasper",
    "Lars",
    "Leon",
    "Magnus",
    "Noah",
    "Oliver",
    "Sander",
    "Theo",
    "Tobias",
    "Vetle",
    "William",
    "Elias",
    "Lucas",
    "Mathias",
    "Jonas",
    "Adrian",
    "Sebastian"
];
const GIRLS = [
    "Emma",
    "Nora",
    "Ella",
    "Sofie",
    "Olivia",
    "Ingrid",
    "Leah",
    "Frida",
    "Maja",
    "Sara",
    "Astrid",
    "Hedda",
    "Tiril",
    "Mia",
    "Selma",
    "Amalie",
    "Thea",
    "Iben",
    "Julie",
    "Live"
];
const LAST = [
    "Haugen",
    "Berg",
    "Solberg",
    "Lie",
    "Moe",
    "Strand",
    "Dahl",
    "Eide",
    "Aas",
    "Bakke",
    "Lund",
    "Ruud",
    "Vik",
    "Fjeld",
    "Nygård",
    "Tveit",
    "Hovland",
    "Sæther",
    "Holm",
    "Brekke",
    "Øvrebø",
    "Rønning"
];
const FOTBALL_SUBS = [
    {
        id: "S-G2016",
        name: "Gutter 2016",
        players: 18,
        coaches: [
            "P-KJETIL",
            "P-ANN",
            "P-LISE"
        ],
        days: [
            2,
            4
        ]
    },
    {
        id: "S-J2016",
        name: "Jenter 2016",
        players: 15,
        girls: true,
        coaches: [
            "P-BEATE"
        ],
        days: [
            1,
            3
        ]
    },
    {
        id: "S-G2015",
        name: "Gutter 2015",
        players: 16,
        coaches: [
            "P-PER"
        ],
        days: [
            1,
            4
        ]
    },
    {
        id: "S-G2017",
        name: "Gutter 2017",
        players: 14,
        coaches: [
            "P-TOM"
        ],
        days: [
            3
        ]
    },
    {
        id: "S-J2015",
        name: "Jenter 2015",
        players: 12,
        girls: true,
        coaches: [
            "P-BEATE"
        ],
        days: [
            2
        ]
    },
    {
        id: "S-KEEPER",
        name: "Keepertrening",
        players: 0,
        coaches: [
            "P-ANN"
        ],
        days: [
            5
        ]
    },
    {
        id: "S-TRENER",
        name: "Trenerteam barnefotball",
        players: 0,
        coaches: [
            "P-KJETIL",
            "P-ANN",
            "P-BEATE",
            "P-PER",
            "P-LISE",
            "P-TOM"
        ],
        days: []
    }
];
const ALLIDRETT_SUBS = [
    {
        id: "S-6AAR",
        name: "6-åringer",
        players: 16,
        coaches: [
            "P-KJETIL"
        ],
        days: [
            6
        ]
    },
    {
        id: "S-7AAR",
        name: "7-åringer",
        players: 14,
        coaches: [
            "P-TOM"
        ],
        days: [
            6
        ]
    }
];
const COACH_ROLE = {
    "P-KJETIL": "R-HOVED",
    "P-ANN": "R-TRENER",
    "P-BEATE": "R-TRENER",
    "P-PER": "R-LAGLEDER",
    "P-LISE": "R-HJELP",
    "P-TOM": "R-TRENER"
};
const ROLES = [
    {
        id: "R-HOVED",
        name: "Hovedlagleder"
    },
    {
        id: "R-TRENER",
        name: "Trener"
    },
    {
        id: "R-LAGLEDER",
        name: "Lagleder"
    },
    {
        id: "R-HJELP",
        name: "Hjelpetrener"
    }
];
function buildGroup(id, name, subs, seed) {
    const r = rng(seed);
    const members = [];
    const coachMembers = new Map();
    for (const s of subs){
        for (const pid of s.coaches){
            let m = coachMembers.get(pid);
            if (!m) {
                const p = PROFILES[pid];
                m = {
                    id: `M-${id}-${pid}`,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    profile: {
                        id: pid
                    },
                    roles: [
                        COACH_ROLE[pid]
                    ],
                    subGroups: []
                };
                coachMembers.set(pid, m);
                members.push(m);
            }
            m.subGroups.push(s.id);
        }
        const used = new Set();
        for(let i = 0; i < s.players; i++){
            const firsts = s.girls ? GIRLS : BOYS;
            let first = "";
            let last = "";
            do {
                first = firsts[Math.floor(r() * firsts.length)];
                last = LAST[Math.floor(r() * LAST.length)];
            }while (used.has(first))
            used.add(first);
            members.push({
                id: `M-${s.id}-${i + 1}`,
                firstName: first,
                lastName: last,
                roles: [],
                subGroups: [
                    s.id
                ]
            });
        }
    }
    if (id === "G-FOTBALL") {
        // Two players whose short names clash (Emma H.), so they get full names.
        const j = members.filter((m)=>m.subGroups?.includes("S-J2016"));
        if (j.length > 1) {
            Object.assign(j[0], {
                firstName: "Emma",
                lastName: "Haugen"
            });
            Object.assign(j[1], {
                firstName: "Emma",
                lastName: "Hansen"
            });
        }
        // Kjetil is parent of a player in Gutter 2016; Hilde Nilsen is a parent without a trainer role.
        const g16 = members.filter((m)=>m.subGroups?.includes("S-G2016") && !m.profile);
        Object.assign(g16[0], {
            firstName: "Emil",
            lastName: "Gramstad",
            guardians: [
                {
                    profile: {
                        id: "P-KJETIL"
                    }
                }
            ]
        });
        Object.assign(g16[1], {
            guardians: [
                {
                    profile: {
                        id: "P-FORELDER"
                    }
                }
            ]
        });
        members.push({
            id: "M-HILDE",
            firstName: "Hilde",
            lastName: "Nilsen",
            profile: {
                id: "P-FORELDER"
            },
            roles: [],
            subGroups: [
                "S-G2016"
            ]
        });
        // Goalkeeper training: some players from the other subgroups.
        for (const m of members.filter((x)=>!x.profile).filter((_, i)=>i % 9 === 3))m.subGroups.push("S-KEEPER");
    }
    return {
        id,
        name,
        roles: ROLES,
        subGroups: subs.map((s)=>({
                id: s.id,
                name: s.name
            })),
        members
    };
}
const GROUPS = [
    buildGroup("G-FOTBALL", "Nymark IL – Fotball", FOTBALL_SUBS, 7),
    buildGroup("G-ALLIDRETT", "Nymark IL – Allidrett", ALLIDRETT_SUBS, 11),
    // Kjetil is a plain member here (no role), so the app must drop this group.
    {
        id: "G-HANDBALL",
        name: "Nymark IL – Håndball",
        roles: ROLES,
        subGroups: [],
        members: [
            {
                id: "M-H-1",
                firstName: "Kjetil",
                lastName: "Gramstad",
                profile: {
                    id: "P-KJETIL"
                },
                roles: []
            }
        ]
    }
];
function groupsFor(profileId) {
    return GROUPS.filter((g)=>(g.members ?? []).some((m)=>m.profile?.id === profileId));
}
const SUB_BY_ID = new Map([
    ...FOTBALL_SUBS.map((s)=>[
            "G-FOTBALL",
            s
        ]),
    ...ALLIDRETT_SUBS.map((s)=>[
            "G-ALLIDRETT",
            s
        ])
].map(([g, s])=>[
        s.id,
        {
            group: g,
            sub: s
        }
    ]));
function at(day, hour, minute) {
    const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(day);
    return new Date((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloMidnight"])(p.year, p.month, p.day).getTime() + (hour * 60 + minute) * 60_000);
}
function mockEvents(now = new Date()) {
    const out = [];
    const today = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(now);
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloMidnight"])(today.year, today.month, today.day);
    for (const [subId, { group, sub }] of SUB_BY_ID){
        if (!sub.days.length) continue;
        const g = GROUPS.find((x)=>x.id === group);
        const recipients = (g.members ?? []).filter((m)=>m.subGroups?.some((s)=>(typeof s === "string" ? s : s.id) === subId));
        for(let d = -42; d <= 35; d++){
            const day = new Date(base.getTime() + d * 86_400_000 + 12 * 3_600_000);
            const wd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(day).weekday;
            const isMatch = wd === 6 && sub.days.indexOf(6) < 0 && Math.abs(d) % 14 < 7 && subId !== "S-KEEPER";
            if (!sub.days.includes(wd) && !isMatch) continue;
            const date = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(day).year}${String((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(day).month).padStart(2, "0")}${String((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(day).day).padStart(2, "0")}`;
            const id = `E-${subId}-${date}${isMatch ? "-K" : ""}`;
            const start = isMatch ? at(day, 10, 0) : sub.name.includes("åringer") ? at(day, 11, 0) : at(day, 17, 30);
            const end = new Date(start.getTime() + (isMatch ? 90 : 75) * 60_000);
            const notSent = start.getTime() - now.getTime() > 7 * 86_400_000;
            const r = rng(hash(id));
            const accepted = [];
            const unanswered = [];
            const declined = [];
            const waiting = [];
            for (const m of recipients){
                const past = end.getTime() < now.getTime();
                const x = r();
                if (notSent) unanswered.push(m.id);
                else if (x < (past ? 0.8 : 0.66)) accepted.push(m.id);
                else if (x < (past ? 0.82 : 0.86)) unanswered.push(m.id);
                else if (x < 0.97 || !isMatch) declined.push(m.id);
                else waiting.push(m.id);
            }
            const owner = PROFILES[sub.coaches[0]];
            out.push({
                id,
                groupId: group,
                heading: isMatch ? "Seriekamp mot Sandviken" : sub.id === "S-KEEPER" ? "Keepertrening" : `Trening ${sub.name}`,
                startTimestamp: start.toISOString(),
                endTimestamp: end.toISOString(),
                cancelled: d === 9 && wd === sub.days[0],
                matchEvent: isMatch,
                inviteTime: notSent ? new Date(start.getTime() - 7 * 86_400_000).toISOString() : undefined,
                location: {
                    feature: isMatch ? "Nymark kunstgress, bane 1" : "Nymark kunstgress",
                    address: "Ikke lagret"
                },
                recipients: {
                    group: {
                        subGroups: [
                            subId
                        ]
                    }
                },
                responses: {
                    acceptedIds: accepted,
                    unansweredIds: unanswered,
                    declinedIds: declined,
                    waitinglistIds: waiting,
                    unconfirmedIds: []
                },
                owners: [
                    {
                        id: owner.id,
                        firstName: owner.firstName,
                        lastName: owner.lastName,
                        response: notSent ? "unanswered" : "accepted"
                    }
                ]
            });
        }
    }
    return out;
}
const TOKEN_PREFIX = "mock-token:";
function profileOf(token) {
    if (!token.startsWith(TOKEN_PREFIX)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$spond$2f$client$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["SpondError"]("Økten i Spond er utløpt. Logg inn på nytt.", "expired");
    return token.slice(TOKEN_PREFIX.length);
}
const mockSpond = {
    async login (identifier, password) {
        const acc = DEMO_ACCOUNTS.find((a)=>a.email === identifier.toLowerCase());
        if (!acc || password !== DEMO_PASSWORD) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$spond$2f$client$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["SpondError"]("Feil e-post, mobilnummer eller passord. Sjekk og prøv igjen.", "login");
        }
        return {
            token: `${TOKEN_PREFIX}${acc.profileId}`,
            expiration: new Date(Date.now() + 12 * 3_600_000).toISOString()
        };
    },
    async profile (token) {
        return PROFILES[profileOf(token)];
    },
    async groups (token) {
        return structuredClone(groupsFor(profileOf(token)));
    },
    async events (token, q) {
        profileOf(token);
        let list = mockEvents();
        if (q.groupId) list = list.filter((e)=>e.groupId === q.groupId);
        if (q.subgroupId) list = list.filter((e)=>e.recipients?.group?.subGroups?.includes(q.subgroupId));
        if (!q.includeScheduled) list = list.filter((e)=>!e.inviteTime);
        const t = (x)=>x ? Date.parse(x) : 0;
        if (q.minStart) list = list.filter((e)=>t(e.startTimestamp) >= q.minStart.getTime());
        if (q.maxStart) list = list.filter((e)=>t(e.startTimestamp) <= q.maxStart.getTime());
        if (q.minEnd) list = list.filter((e)=>t(e.endTimestamp) >= q.minEnd.getTime());
        if (q.maxEnd) list = list.filter((e)=>t(e.endTimestamp) <= q.maxEnd.getTime());
        list.sort((a, b)=>t(a.startTimestamp) - t(b.startTimestamp));
        return structuredClone(list.slice(0, q.max ?? 100)).map((e)=>{
            const { groupId, ...rest } = e;
            void groupId;
            return rest;
        });
    }
};
}),
"[project]/lib/store/access.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Who may read and write what. Every store function takes an `Access` (built
 * from the user's Spond data on the server, never from the browser) and
 * checks the group before touching the database.
 */ __turbopack_context__.s([
    "NO_RIGHTS",
    ()=>NO_RIGHTS,
    "UserError",
    ()=>UserError,
    "assertAdmin",
    ()=>assertAdmin,
    "assertGroup",
    ()=>assertGroup,
    "assertSuperadmin",
    ()=>assertSuperadmin,
    "assertTags",
    ()=>assertTags,
    "userRights",
    ()=>userRights
]);
class UserError extends Error {
    constructor(message){
        super(message);
        this.name = "UserError";
    }
}
function assertGroup(access, groupId) {
    if (!access.groupIds.has(groupId)) throw new UserError("Du har ikke tilgang til denne gruppen.");
}
const NO_RIGHTS = {
    superadmin: false,
    admin: false,
    ai: false,
    app: false,
    tags: false
};
function userRights(profileId, role, superadminId) {
    const sa = !!superadminId.trim() && profileId === superadminId.trim();
    const admin = sa || !!role?.is_admin;
    return {
        superadmin: sa,
        admin,
        ai: sa || !!role?.can_use_ai,
        app: admin || !!role?.can_use_app,
        tags: sa || (role?.can_see_tags ?? true)
    };
}
function assertAdmin(rights) {
    if (!rights.admin) throw new UserError("Bare administratorer kan endre dette.");
}
function assertTags(rights) {
    if (!rights.tags) throw new UserError("Du har ikke tilgang til tagger.");
}
function assertSuperadmin(rights) {
    if (!rights.superadmin) throw new UserError("Bare superadmin kan endre dette.");
}
}),
"[project]/lib/store/bank.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The exercise bank is one, shared by every group in the app: no group owns
 * it. Exercises, versions, observations, patterns, proposals and the log of
 * changes to exercises are stored with this id in `spond_group_id`, while
 * plans, evaluations, learnings and team settings belong to the team's group.
 * Trainers reach the bank through their own group, which the store checks.
 */ __turbopack_context__.s([
    "BANK",
    ()=>BANK
]);
const BANK = "felles";
}),
"[project]/lib/store/edits.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exerciseEdits",
    ()=>exerciseEdits,
    "hasEdits",
    ()=>hasEdits,
    "logEdit",
    ()=>logEdit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/bank.ts [instrumentation] (ecmascript)");
;
;
async function logEdit(d, access, groupId, e) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    await d.query(`INSERT INTO edit_log (spond_group_id, kind, exercise_code, plan_id, changes, author) VALUES (CASE WHEN $3::text IS NULL THEN $1 ELSE '${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]}' END, $2, $3, $4, $5::jsonb, $6)`, [
        groupId,
        e.kind,
        e.exerciseCode ?? null,
        e.planId ?? null,
        JSON.stringify(e.changes),
        access.profileId
    ]);
}
async function hasEdits(d, groupId, exerciseCode) {
    const r = await d.query("SELECT 1 FROM edit_log WHERE spond_group_id = $1 AND exercise_code = $2 LIMIT 1", [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        exerciseCode
    ]);
    return r.length > 0;
}
async function exerciseEdits(d, access, groupId, exerciseCode, n = 10) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return d.query(`SELECT id, kind, changes, author, created_at FROM edit_log
      WHERE spond_group_id = $1 AND exercise_code = $2 ORDER BY created_at DESC, id DESC LIMIT $3`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        exerciseCode,
        n
    ]);
}
}),
"[project]/lib/store/improvements.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bandsInUse",
    ()=>bandsInUse,
    "busyProposals",
    ()=>busyProposals,
    "decideProposal",
    ()=>decideProposal,
    "getProposal",
    ()=>getProposal,
    "listProposals",
    ()=>listProposals,
    "openProposalCount",
    ()=>openProposalCount,
    "openProposalFor",
    ()=>openProposalFor,
    "rejectionsFor",
    ()=>rejectionsFor,
    "retireProposal",
    ()=>retireProposal,
    "saveProposal",
    ()=>saveProposal,
    "waitingPerGroup",
    ()=>waitingPerGroup
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/improvements.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/format.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/bands.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/fagplan.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/bank.ts [instrumentation] (ecmascript)");
;
;
;
;
;
;
const SELECT = `
  SELECT p.id, p.exercise_code, p.kind, p.status, p.reason, p.base_values, p.proposed, p.rejection, p.decided_by, p.decided_at, p.created_at,
         e.id AS exercise_id, coalesce(e.name, p.proposed->>'name', p.exercise_code) AS exercise_name
    FROM improvement_proposals p
    LEFT JOIN exercises e ON e.spond_group_id = p.spond_group_id AND e.code = p.exercise_code`;
async function listProposals(d, access, groupId, handled = 10) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const [open, auto, done] = await Promise.all([
        d.query(`${SELECT} WHERE p.spond_group_id = $1 AND p.status = 'ny' ORDER BY p.created_at, p.id`, [
            bank
        ]),
        d.query(`${SELECT} WHERE p.spond_group_id = $1 AND p.status = 'auto' AND p.decided_at > now() - make_interval(days => $2::int) ORDER BY p.decided_at DESC, p.id DESC`, [
            bank,
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["QUIET_DAYS"]
        ]),
        d.query(`${SELECT} WHERE p.spond_group_id = $1 AND p.status IN ('brukt', 'endret', 'avvist') ORDER BY p.decided_at DESC, p.id DESC LIMIT $2::int`, [
            bank,
            handled
        ])
    ]);
    return {
        open,
        auto,
        handled: done
    };
}
async function getProposal(d, access, groupId, id) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const [p] = await d.query(`${SELECT} WHERE p.spond_group_id = $1 AND p.id = $2`, [
        bank,
        id
    ]);
    if (!p) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke forslaget.");
    return p;
}
async function openProposalFor(d, access, groupId, code) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const [r] = await d.query("SELECT id FROM improvement_proposals WHERE spond_group_id = $1 AND exercise_code = $2 AND status = 'ny'", [
        bank,
        code
    ]);
    return r?.id ?? null;
}
async function openProposalCount(d, access, groupId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const [r] = await d.query("SELECT count(*)::int AS n FROM improvement_proposals WHERE spond_group_id = $1 AND status = 'ny'", [
        bank
    ]);
    return r.n;
}
async function decideProposal(d, access, groupId, id, status, rejection = null) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const r = await d.query(`UPDATE improvement_proposals SET status = $3, rejection = $4, decided_by = $5, decided_at = now()
      WHERE spond_group_id = $1 AND id = $2 AND status = 'ny' RETURNING id`, [
        bank,
        id,
        status,
        rejection,
        access.profileId
    ]);
    return r.length > 0;
}
async function busyProposals(d, now = new Date()) {
    const rows = await d.query(`SELECT id, exercise_code, signature, status, kind FROM improvement_proposals
      WHERE spond_group_id = $1 AND (status = 'ny' OR coalesce(decided_at, created_at) > $2::timestamptz - make_interval(days => $3::int))`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        now,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$improvements$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["QUIET_DAYS"]
    ]);
    const open = rows.filter((r)=>r.status === "ny");
    return {
        open: new Set(open.map((r)=>r.exercise_code)),
        recent: new Set(rows.map((r)=>`${r.exercise_code}\n${r.signature}`)),
        filling: new Map(open.filter((r)=>r.kind === "metadata").map((r)=>[
                r.exercise_code,
                r.id
            ]))
    };
}
async function retireProposal(d, id) {
    await d.query("UPDATE improvement_proposals SET status = 'utdatert', decided_at = now() WHERE spond_group_id = $1 AND id = $2 AND status = 'ny'", [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        id
    ]);
}
async function bandsInUse(d, now = new Date()) {
    const rows = await d.query("SELECT DISTINCT birth_year FROM team_settings WHERE birth_year IS NOT NULL");
    const year = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(now).year;
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$fagplan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BAND_KEYS"].filter((b)=>rows.some((r)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["teamBand"])(r.birth_year, year) === b));
}
async function rejectionsFor(d, code) {
    const rows = await d.query(`SELECT rejection FROM improvement_proposals WHERE spond_group_id = $1 AND exercise_code = $2 AND status = 'avvist' AND rejection IS NOT NULL
      ORDER BY decided_at DESC LIMIT 3`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        code
    ]);
    return rows.map((r)=>r.rejection);
}
async function saveProposal(d, p) {
    const r = await d.query(`INSERT INTO improvement_proposals (spond_group_id, exercise_code, kind, status, reason, signature, base_values, proposed, model, cost_usd, decided_at)
     VALUES ($1, $2, $3, $4::text, $5, $6, $7::jsonb, $8::jsonb, $9, $10, CASE WHEN $4::text = 'ny' THEN NULL ELSE now() END)
     ON CONFLICT DO NOTHING RETURNING id`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        p.code,
        p.kind,
        p.status ?? "ny",
        p.reason,
        p.signature.slice(0, 300),
        JSON.stringify(p.base),
        JSON.stringify(p.proposed),
        p.model,
        Number(p.costUsd.toFixed(5))
    ]);
    return r[0]?.id ?? null;
}
async function waitingPerGroup(d) {
    return d.query(`SELECT g.g AS "groupId", count(*)::int AS n
       FROM (SELECT DISTINCT unnest(group_ids) AS g FROM push_subscriptions) g
       JOIN improvement_proposals p ON p.spond_group_id = '${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]}' AND p.status = 'ny'
      GROUP BY 1 ORDER BY 1`);
}
}),
"[project]/lib/store/pitch-schedule.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearWeekdayPitches",
    ()=>clearWeekdayPitches,
    "deletePeriod",
    ()=>deletePeriod,
    "deleteWeekdayPitches",
    ()=>deleteWeekdayPitches,
    "eventOverrides",
    ()=>eventOverrides,
    "fixedPitchIds",
    ()=>fixedPitchIds,
    "listWeekdayPitches",
    ()=>listWeekdayPitches,
    "pitchesForEvent",
    ()=>pitchesForEvent,
    "pitchesForEvents",
    ()=>pitchesForEvents,
    "saveWeekdayPitches",
    ()=>saveWeekdayPitches,
    "setEventPitches",
    ()=>setEventPitches
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/pitch-schedule.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
;
;
/**
 * Faste baner per ukedag (weekday_pitches) and the pitches for one training
 * (event_pitches). See lib/plans/pitch-schedule.ts for the rules.
 */ const COLS = "id, weekday, valid_from::text AS valid_from, valid_to::text AS valid_to, pitch_ids, updated_by, updated_at";
const ids = (v)=>Array.isArray(v) ? v.map(Number).filter((x)=>Number.isInteger(x)) : [];
function rowOf(r) {
    return {
        ...r,
        id: Number(r.id),
        weekday: Number(r.weekday),
        pitch_ids: ids(r.pitch_ids)
    };
}
async function rowsOf(d, groupId, sub) {
    const rows = await d.query(`SELECT ${COLS} FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY weekday, valid_from`, [
        groupId,
        sub
    ]);
    return rows.map(rowOf);
}
async function listWeekdayPitches(d, access, groupId, sub) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (sub) {
        const own = await rowsOf(d, groupId, sub);
        if (own.length) return {
            rows: own,
            inherited: false
        };
        return {
            rows: await rowsOf(d, groupId, ""),
            inherited: true
        };
    }
    return {
        rows: await rowsOf(d, groupId, ""),
        inherited: false
    };
}
/** The pitches must be at the facility (all of them can be chosen). */ async function checkPitches(d, pitchIds) {
    if (!pitchIds.length) return;
    const known = await d.query("SELECT id FROM pitches WHERE id = ANY($1::int[])", [
        pitchIds
    ]);
    if (known.length !== new Set(pitchIds).size) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Ukjent bane.");
}
async function fixedPitchIds(d, access, groupId, sub, today) {
    const { rows } = await listWeekdayPitches(d, access, groupId, sub);
    const ids = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["currentRows"])(rows, today).filter((r)=>!r.valid_to || r.valid_to >= today).flatMap((r)=>r.pitch_ids);
    return [
        ...new Set(ids)
    ];
}
/** A subgroup that followed the main group gets a copy of its rows before its first change. */ async function ownCopy(t, groupId, sub) {
    if (!sub) return;
    const own = await t.query("SELECT count(*)::int AS n FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
        groupId,
        sub
    ]);
    if (own[0]?.n) return;
    await t.query(`INSERT INTO weekday_pitches (spond_group_id, spond_subgroup_id, weekday, valid_from, valid_to, pitch_ids, updated_by, updated_at)
     SELECT spond_group_id, $2, weekday, valid_from, valid_to, pitch_ids, updated_by, updated_at
       FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = ''`, [
        groupId,
        sub
    ]);
}
const IN_PERIOD = "valid_from = $3::date AND valid_to IS NOT DISTINCT FROM $4::date";
async function saveWeekdayPitches(d, access, groupId, sub, input, /** Editing a banefordeling: its rows are replaced by these (days left out are removed). */ replace) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const problem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateWeekdayPitches"])(input);
    if (problem) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"](problem);
    await checkPitches(d, [
        ...new Set(input.days.flatMap((x)=>x.pitch_ids))
    ]);
    await d.tx(async (t)=>{
        await ownCopy(t, groupId, sub);
        if (replace) {
            await t.query(`DELETE FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND ${IN_PERIOD}`, [
                groupId,
                sub,
                replace.from,
                replace.to
            ]);
        }
        for (const day of input.days){
            await t.query(`INSERT INTO weekday_pitches (spond_group_id, spond_subgroup_id, weekday, valid_from, valid_to, pitch_ids, updated_by)
         VALUES ($1, $2, $3, $4::date, $5::date, $6::int[], $7)
         ON CONFLICT (spond_group_id, spond_subgroup_id, weekday, valid_from) DO UPDATE
           SET valid_to = EXCLUDED.valid_to, pitch_ids = EXCLUDED.pitch_ids, updated_by = EXCLUDED.updated_by, updated_at = now()`, [
                groupId,
                sub,
                day.weekday,
                input.from,
                input.to,
                [
                    ...new Set(day.pitch_ids)
                ],
                access.profileId
            ]);
        }
    });
}
async function deleteWeekdayPitches(d, access, groupId, sub, id) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const gone = await d.query("DELETE FROM weekday_pitches WHERE id = $1 AND spond_group_id = $2 AND spond_subgroup_id = $3 RETURNING id", [
        id,
        groupId,
        sub
    ]);
    if (!gone.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke de faste banene.");
}
async function deletePeriod(d, access, groupId, sub, period) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    await d.tx(async (t)=>{
        await ownCopy(t, groupId, sub);
        const gone = await t.query(`DELETE FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND ${IN_PERIOD} RETURNING id`, [
            groupId,
            sub,
            period.from,
            period.to
        ]);
        if (!gone.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke banefordelingen.");
    });
}
async function clearWeekdayPitches(d, groupId, sub) {
    await d.query("DELETE FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
        groupId,
        sub
    ]);
}
async function eventOverrides(d, access, groupId, eventIds) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!eventIds.length) return new Map();
    const rows = await d.query("SELECT spond_event_id, pitch_ids FROM event_pitches WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[])", [
        groupId,
        eventIds
    ]);
    return new Map(rows.map((r)=>[
            r.spond_event_id,
            ids(r.pitch_ids)
        ]));
}
async function pitchesForEvent(d, access, groupId, e) {
    const [{ rows }, over] = await Promise.all([
        listWeekdayPitches(d, access, groupId, e.sub),
        eventOverrides(d, access, groupId, [
            e.id
        ])
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["eventPitches"])(rows, over.get(e.id) ?? null, e.date);
}
async function setEventPitches(d, access, groupId, e, pitchIds) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const list = [
        ...new Set(pitchIds)
    ];
    if (list.length > 12) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Velg maks 12 baner.");
    await checkPitches(d, list);
    const now = await pitchesForEvent(d, access, groupId, e);
    if (!list.length || now.fixed && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["samePitches"])(list, now.fixed.pitch_ids)) {
        await d.query("DELETE FROM event_pitches WHERE spond_group_id = $1 AND spond_event_id = $2", [
            groupId,
            e.id
        ]);
        return;
    }
    await d.query(`INSERT INTO event_pitches (spond_group_id, spond_event_id, pitch_ids, updated_by) VALUES ($1, $2, $3::int[], $4)
     ON CONFLICT (spond_group_id, spond_event_id) DO UPDATE SET pitch_ids = EXCLUDED.pitch_ids, updated_by = EXCLUDED.updated_by, updated_at = now()`, [
        groupId,
        e.id,
        list,
        access.profileId
    ]);
}
async function pitchesForEvents(d, access, groupId, events) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!events.length) return new Map();
    const all = (await d.query(`SELECT spond_subgroup_id, ${COLS} FROM weekday_pitches WHERE spond_group_id = $1 ORDER BY weekday, valid_from`, [
        groupId
    ])).map((r)=>({
            ...rowOf(r),
            spond_subgroup_id: r.spond_subgroup_id
        }));
    const rowsFor = (sub)=>{
        const own = all.filter((r)=>r.spond_subgroup_id === sub);
        return own.length || !sub ? own : all.filter((r)=>r.spond_subgroup_id === "");
    };
    const over = await eventOverrides(d, access, groupId, events.map((e)=>e.id));
    return new Map(events.map((e)=>[
            e.id,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["eventPitches"])(rowsFor(e.sub), over.get(e.id) ?? null, e.date)
        ]));
}
}),
"[project]/lib/store/training.ts [instrumentation] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LEARNING_MAX",
    ()=>LEARNING_MAX,
    "PRINCIPLES_MAX",
    ()=>PRINCIPLES_MAX,
    "TooSimilarError",
    ()=>TooSimilarError,
    "addPlanComment",
    ()=>addPlanComment,
    "approvePlan",
    ()=>approvePlan,
    "deleteExercise",
    ()=>deleteExercise,
    "deletePlanComment",
    ()=>deletePlanComment,
    "feedbackSince",
    ()=>feedbackSince,
    "followMainGroup",
    ()=>followMainGroup,
    "getExercise",
    ()=>getExercise,
    "getPlan",
    ()=>getPlan,
    "getTeamSettings",
    ()=>getTeamSettings,
    "lastPlanPitches",
    ()=>lastPlanPitches,
    "latestLearning",
    ()=>latestLearning,
    "latestPlans",
    ()=>latestPlans,
    "latestPrinciples",
    ()=>latestPrinciples,
    "learningState",
    ()=>learningState,
    "listExercises",
    ()=>listExercises,
    "listFeedback",
    ()=>listFeedback,
    "listPitches",
    ()=>listPitches,
    "listPlanComments",
    ()=>listPlanComments,
    "listSeason",
    ()=>listSeason,
    "markCommentsUsed",
    ()=>markCommentsUsed,
    "myBankFeedback",
    ()=>myBankFeedback,
    "planVersions",
    ()=>planVersions,
    "previousPlan",
    ()=>previousPlan,
    "principlesState",
    ()=>principlesState,
    "saveBankFeedback",
    ()=>saveBankFeedback,
    "saveExercise",
    ()=>saveExercise,
    "saveFeedback",
    ()=>saveFeedback,
    "saveLearning",
    ()=>saveLearning,
    "savePlan",
    ()=>savePlan,
    "savePlanExercise",
    ()=>savePlanExercise,
    "savePrinciples",
    ()=>savePrinciples,
    "saveSeason",
    ()=>saveSeason,
    "saveTeamSettings",
    ()=>saveTeamSettings,
    "seasonTheme",
    ()=>seasonTheme,
    "teamExperience",
    ()=>teamExperience,
    "teamPitches",
    ()=>teamPitches,
    "unapprovePlan",
    ()=>unapprovePlan
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sensitive.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/plan.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/drawing.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/format.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/nff/bands.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/exercise-edits.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/plans/exercise-values.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/bank.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/edits.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$versions$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/versions.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/pitch-schedule.ts [instrumentation] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
class TooSimilarError extends __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"] {
    match;
    constructor(match){
        super((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["tooSimilarText"])(match)), this.match = match;
        this.name = "TooSimilarError";
    }
}
/**
 * Season plan, team settings, the exercise bank, training plans with
 * versions, comments, evaluations and the team's learnings. Only Spond ids
 * and the trainers' own text are stored; no names.
 */ const wrap = (f)=>{
    try {
        return f();
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["PlanError"]) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"](err.message);
        throw err;
    }
};
/** Evaluations that count for a scope: all for the main group; for a subgroup, its own and those for the whole group. */ const FEEDBACK_IN_SCOPE = "($2 = '' OR cardinality(f.spond_subgroup_ids) = 0 OR $2 = ANY(f.spond_subgroup_ids))";
async function followMainGroup(d, access, groupId, sub, part, year) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!sub) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Hovedgruppa har ikke noe å arve fra.");
    await d.tx(async (t)=>{
        if (part === "season") await t.query("DELETE FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND year = $3", [
            groupId,
            sub,
            year ?? 0
        ]);
        if (part === "team") {
            await t.query("DELETE FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
                groupId,
                sub
            ]);
            await t.query("DELETE FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
                groupId,
                sub
            ]);
            await t.query("DELETE FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
                groupId,
                sub
            ]);
        }
        if (part === "principles") await t.query("DELETE FROM team_principles WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
            groupId,
            sub
        ]);
        if (part === "learnings") await t.query("DELETE FROM team_learnings WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [
            groupId,
            sub
        ]);
    });
}
async function listSeason(d, access, groupId, sub, year) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = await d.query(`SELECT spond_subgroup_id, month, theme, coalesce(description, '') AS description, updated_by, updated_at
       FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '') AND year = $3 ORDER BY month`, [
        groupId,
        sub,
        year
    ]);
    const inherited = !!sub && !rows.some((r)=>r.spond_subgroup_id === sub);
    const scope = inherited ? "" : sub;
    const own = rows.filter((r)=>r.spond_subgroup_id === scope);
    return {
        rows: own.map((r)=>({
                month: r.month,
                theme: r.theme,
                description: r.description,
                updated_by: r.updated_by,
                updated_at: r.updated_at
            })),
        inherited
    };
}
async function saveSeason(d, access, groupId, sub, year, themes, descriptions) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = wrap(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateSeason"])(year, themes, descriptions));
    await d.tx(async (t)=>{
        await t.query("DELETE FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND year = $3 AND NOT (month = ANY($4::int[]))", [
            groupId,
            sub,
            year,
            rows.map((r)=>r.month)
        ]);
        for (const r of rows){
            await t.query(`INSERT INTO season_themes (spond_group_id, spond_subgroup_id, year, month, theme, description, updated_by)
         VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
         ON CONFLICT (spond_group_id, spond_subgroup_id, year, month) DO UPDATE
           SET theme = EXCLUDED.theme, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = now()
           WHERE season_themes.theme IS DISTINCT FROM EXCLUDED.theme OR season_themes.description IS DISTINCT FROM EXCLUDED.description`, [
                groupId,
                sub,
                year,
                r.month,
                r.theme,
                r.description,
                access.profileId
            ]);
        }
    });
}
async function seasonTheme(d, access, groupId, sub, year, month) {
    const { rows } = await listSeason(d, access, groupId, sub, year);
    const hit = rows.find((r)=>r.month === month);
    return hit ? {
        theme: hit.theme,
        description: hit.description
    } : null;
}
async function getTeamSettings(d, access, groupId, sub) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = await d.query(`SELECT spond_subgroup_id, coalesce(age_group, '') AS age_group, birth_year, gender, session_minutes, coalesce(pitch, '') AS pitch,
            coalesce(equipment, '') AS equipment, updated_by, updated_at
       FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '')`, [
        groupId,
        sub
    ]);
    const inherited = !!sub && !rows.some((r)=>r.spond_subgroup_id === sub);
    const scope = inherited ? "" : sub;
    const pitches = await d.query("SELECT pitch_id FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY pitch_id", [
        groupId,
        scope
    ]);
    const pitch_ids = pitches.map((p)=>p.pitch_id);
    const row = rows.find((r)=>r.spond_subgroup_id === scope);
    if (!row) return {
        age_group: "",
        birth_year: null,
        gender: null,
        session_minutes: null,
        pitch_ids,
        pitch: "",
        equipment: "",
        updated_by: null,
        updated_at: null,
        inherited
    };
    const { age_group, birth_year, gender, session_minutes, pitch, equipment, updated_by, updated_at } = row;
    return {
        age_group,
        birth_year,
        gender,
        session_minutes,
        pitch,
        equipment,
        updated_by,
        updated_at,
        pitch_ids,
        inherited
    };
}
async function saveTeamSettings(d, access, groupId, sub, input) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const s = wrap(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateTeamSettings"])(input));
    // The old pitch list (team_pitches) is only changed when given; the form now sets pitches per weekday.
    const keepPitches = input.pitch_ids === undefined;
    const known = await d.query("SELECT id FROM pitches WHERE id = ANY($1::int[])", [
        s.pitch_ids
    ]);
    if (known.length !== s.pitch_ids.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Ukjent bane.");
    await d.tx(async (t)=>{
        await t.query(`INSERT INTO team_settings (spond_group_id, spond_subgroup_id, age_group, birth_year, gender, session_minutes, pitch, equipment, updated_by)
       VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, NULLIF($7, ''), NULLIF($8, ''), $9)
       ON CONFLICT (spond_group_id, spond_subgroup_id) DO UPDATE
         SET age_group = EXCLUDED.age_group, birth_year = EXCLUDED.birth_year, gender = EXCLUDED.gender, session_minutes = EXCLUDED.session_minutes, pitch = EXCLUDED.pitch,
             equipment = EXCLUDED.equipment, updated_by = EXCLUDED.updated_by, updated_at = now()`, [
            groupId,
            sub,
            s.age_group,
            s.birth_year,
            s.gender,
            s.session_minutes,
            s.pitch,
            s.equipment,
            access.profileId
        ]);
        if (keepPitches) return;
        await t.query("DELETE FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND NOT (pitch_id = ANY($3::int[]))", [
            groupId,
            sub,
            s.pitch_ids
        ]);
        await t.query("INSERT INTO team_pitches (spond_group_id, spond_subgroup_id, pitch_id) SELECT $1, $2, unnest($3::int[]) ON CONFLICT DO NOTHING", [
            groupId,
            sub,
            s.pitch_ids
        ]);
    });
}
const PRINCIPLES_MAX = 2000;
/** The latest versions in the scope, or the main group's when a subgroup has none. */ async function versions(d, table, cols, groupId, sub, n) {
    const own = await d.query(`SELECT ${cols} FROM ${table} WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY created_at DESC, id DESC LIMIT $3`, [
        groupId,
        sub,
        n
    ]);
    if (own.length || !sub) return {
        versions: own,
        inherited: false
    };
    const main = await d.query(`SELECT ${cols} FROM ${table} WHERE spond_group_id = $1 AND spond_subgroup_id = '' ORDER BY created_at DESC, id DESC LIMIT $2`, [
        groupId,
        n
    ]);
    return {
        versions: main,
        inherited: true
    };
}
async function principlesState(d, access, groupId, sub, n = 6) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return versions(d, "team_principles", "id, body, created_by, created_at", groupId, sub, n);
}
async function latestPrinciples(d, access, groupId, sub) {
    return (await principlesState(d, access, groupId, sub, 1)).versions[0]?.body ?? "";
}
async function savePrinciples(d, access, groupId, sub, text) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const b = text.trim();
    if (b.length > PRINCIPLES_MAX) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"](`Prinsippene kan ha maks ${PRINCIPLES_MAX} tegn.`);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(b)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Prinsippene skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    const last = await d.query("SELECT body FROM team_principles WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1", [
        groupId,
        sub
    ]);
    if (last[0]?.body === b) return;
    await d.query("INSERT INTO team_principles (spond_group_id, spond_subgroup_id, body, created_by) VALUES ($1, $2, $3, $4)", [
        groupId,
        sub,
        b,
        access.profileId
    ]);
}
// Pitches (shared by all groups) ------------------------------------------------------------
const PITCH_COLUMNS = "id, parent_id, facility, name, surface, pitch_type, lighting, length_m, width_m, retired";
async function listPitches(d) {
    return d.query(`SELECT ${PITCH_COLUMNS} FROM pitches ORDER BY facility, sort, id`);
}
async function teamPitches(d, access, groupId, sub, today = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloDate"])(new Date())) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const fixed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$pitch$2d$schedule$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fixedPitchIds"])(d, access, groupId, sub, today);
    if (fixed.length) return d.query(`SELECT ${PITCH_COLUMNS} FROM pitches WHERE id = ANY($1::int[]) ORDER BY facility, sort, id`, [
        fixed
    ]);
    return d.query(`SELECT ${PITCH_COLUMNS.split(", ").map((c)=>`p.${c}`).join(", ")}
       FROM team_pitches tp JOIN pitches p ON p.id = tp.pitch_id
      WHERE tp.spond_group_id = $1
        AND tp.spond_subgroup_id = CASE WHEN EXISTS (SELECT 1 FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id = $2) THEN $2 ELSE '' END
      ORDER BY p.facility, p.sort, p.id`, [
        groupId,
        sub
    ]);
}
const EXERCISE_SELECT = `
  SELECT e.id, e.code, e.name, e.category, e.themes, e.min_players, e.max_players, e.duration_minutes,
         coalesce(e.area, '') AS area, coalesce(e.organisation, '') AS organisation, coalesce(e.execution, '') AS execution,
         coalesce(e.learning_points, '') AS learning_points, coalesce(e.questions, '') AS questions,
         coalesce(e.easier, '') AS easier, coalesce(e.harder, '') AS harder, coalesce(e.nff_url, '') AS nff_url,
         e.drawing::text AS drawing, e.source, coalesce(e.based_on, '') AS based_on, e.status, e.updated_at, e.version,
         e.bands, coalesce(e.nff_activity, '') AS nff_activity, e.nff_tags,
         coalesce(s.fb_n, 0) AS fb_n, coalesce(s.fb_sessions, 0) AS fb_sessions, coalesce(s.fb_bank, 0) AS fb_bank, coalesce(s.fb_good, 0) AS fb_good,
         coalesce(s.fb_ok, 0) AS fb_ok, coalesce(s.fb_bad, 0) AS fb_bad, coalesce(s.fb_yes, 0) AS fb_yes,
         coalesce(s.fb_changes, 0) AS fb_changes, coalesce(s.fb_no, 0) AS fb_no, s.fb_mean, s.fb_minutes, s.fb_last, t.fb_tags
    FROM exercises e
    LEFT JOIN (
      SELECT exercise_code, count(*)::int AS fb_n, count(DISTINCT spond_event_id)::int AS fb_sessions,
             (count(*) FILTER (WHERE plan_id IS NULL))::int AS fb_bank,
             avg(rating)::float8 AS fb_mean,
             (count(*) FILTER (WHERE rating = 3))::int AS fb_good, (count(*) FILTER (WHERE rating = 2))::int AS fb_ok,
             (count(*) FILTER (WHERE rating = 1))::int AS fb_bad,
             (count(*) FILTER (WHERE use_again = 'yes'))::int AS fb_yes, (count(*) FILTER (WHERE use_again = 'changes'))::int AS fb_changes,
             (count(*) FILTER (WHERE use_again = 'no'))::int AS fb_no,
             avg(actual_minutes)::float8 AS fb_minutes, max(updated_at) AS fb_last
        FROM exercise_feedback
       WHERE (exercise_no IS NOT NULL OR plan_id IS NULL) AND exercise_code IS NOT NULL
       GROUP BY exercise_code) s ON s.exercise_code = e.code
    LEFT JOIN (
      SELECT exercise_code, string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag) AS fb_tags
        FROM (SELECT exercise_code, tag, count(*) AS n FROM exercise_feedback, unnest(tags) AS tag
               WHERE (exercise_no IS NOT NULL OR plan_id IS NULL) AND exercise_code IS NOT NULL
               GROUP BY exercise_code, tag) t0
       GROUP BY exercise_code) t ON t.exercise_code = e.code
   WHERE e.spond_group_id = $1`;
function toBank(r) {
    let drawing = null;
    try {
        drawing = r.drawing ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateDrawing"])(JSON.parse(r.drawing)) : null;
    } catch  {
        drawing = null;
    }
    const tags = {};
    for (const part of (r.fb_tags ?? "").split(",").filter(Boolean)){
        const [k, n] = part.split(":");
        tags[k] = Number(n);
    }
    return {
        ...r,
        themes: r.themes ?? [],
        bands: r.bands ?? [],
        nff_tags: r.nff_tags ?? [],
        drawing,
        fb_tags: tags
    };
}
async function listExercises(d, access, groupId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = await d.query(`${EXERCISE_SELECT} ORDER BY e.category, lower(e.name), e.id`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]
    ]);
    return rows.map(toBank);
}
async function getExercise(d, access, groupId, id) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = await d.query(`${EXERCISE_SELECT} AND e.id = $2`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
        id
    ]);
    if (!rows.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke øvelsen.");
    return toBank(rows[0]);
}
async function saveExercise(d, access, groupId, input, id, opts = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const v = wrap(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateExercise"])(input));
    const before = id ? await getExercise(d, access, groupId, id) : null;
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const drawing = v.drawing ? JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["compactDrawing"])(v.drawing)) : null;
    const fields = [
        v.name,
        v.category,
        v.themes,
        v.min_players,
        v.max_players,
        v.duration_minutes,
        v.area,
        v.organisation,
        v.execution,
        v.learning_points,
        v.questions,
        v.easier,
        v.harder,
        v.nff_url,
        access.profileId,
        drawing,
        v.status,
        v.bands,
        v.nff_activity,
        v.nff_tags
    ];
    if (!id) {
        // A variant is meant to be like the one it is based on.
        const like = opts.basedOn ? null : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["tooSimilar"])({
            ...v,
            drawing: v.drawing ?? null
        }, await listExercises(d, access, groupId));
        if (like) throw new TooSimilarError(like);
        const taken = (await d.query("SELECT code FROM exercises WHERE spond_group_id = $1", [
            bank
        ])).map((r)=>r.code);
        const [{ id: newId }] = await d.query(`INSERT INTO exercises (spond_group_id, code, name, category, themes, min_players, max_players, duration_minutes, area,
                              organisation, execution, learning_points, questions, easier, harder, nff_url, created_by, updated_by,
                              drawing, status, bands, nff_activity, nff_tags, based_on, source)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''),
               NULLIF($13, ''), NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, ''), $17, $17, $18::jsonb, coalesce($19, 'active'),
               $20::text[], NULLIF($21, ''), $22::text[], NULLIF($23, ''), $24)
       RETURNING id`, [
            bank,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseCode"])(v.name, taken),
            ...fields,
            opts.basedOn ?? "",
            opts.madeByKi ? "ai" : "manual"
        ]);
        return newId;
    }
    const n = await d.query(`UPDATE exercises SET name = $3, category = $4, themes = $5::text[], min_players = $6, max_players = $7, duration_minutes = $8,
            area = NULLIF($9, ''), organisation = NULLIF($10, ''), execution = NULLIF($11, ''), learning_points = NULLIF($12, ''),
            questions = NULLIF($13, ''), easier = NULLIF($14, ''), harder = NULLIF($15, ''), nff_url = NULLIF($16, ''),
            updated_by = $17, drawing = $18::jsonb, status = coalesce($19, status), bands = $20::text[],
            nff_activity = NULLIF($21, ''), nff_tags = $22::text[], updated_at = now()
      WHERE id = $1 AND spond_group_id = $2 RETURNING id`, [
        id,
        bank,
        ...fields
    ]);
    if (!n.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke øvelsen.");
    if (before) {
        await logExerciseChange(d, access, groupId, before, input, opts.kiDraft);
        // A change is a new version, so evaluations before and after can be compared.
        const old = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseValues"])(before);
        const now = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseValues"])(await getExercise(d, access, groupId, id));
        if (Object.keys((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseChanges"])(old, now)).length) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$versions$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["recordVersion"])(d, bank, before.code, {
                before: old,
                beforeVersion: before.version ?? 1,
                after: now,
                source: opts.source ?? "endret",
                actor: access.profileId,
                proposalId: opts.proposalId
            });
        }
    }
    return id;
}
async function logExerciseChange(d, access, groupId, b, input, kiDraft) {
    const old = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$values$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseValues"])(b);
    const saved = {
        ...old,
        ...input,
        status: input.status || old.status
    };
    const log = (kind, changes)=>Object.keys(changes).length ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["logEdit"])(d, access, groupId, {
            kind,
            exerciseCode: b.code,
            changes
        }) : Promise.resolve();
    if (kiDraft) {
        await log("ki_forslag", (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseChanges"])(old, kiDraft));
        await log("retting_av_ki", (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseChanges"])(kiDraft, saved));
        return;
    }
    // The first change of an exercise KI made is a correction of KI.
    const kind = b.source === "ai" && !await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["hasEdits"])(d, groupId, b.code) ? "retting_av_ki" : "manuell";
    await log(kind, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$exercise$2d$edits$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseChanges"])(old, saved));
}
async function deleteExercise(d, access, rights, groupId, id) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertAdmin"])(rights);
    // Variants of the deleted exercise become exercises of their own.
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    await d.tx(async (t)=>{
        const gone = await t.query("DELETE FROM exercises WHERE id = $1 AND spond_group_id = $2 RETURNING code", [
            id,
            bank
        ]);
        if (gone.length) await t.query("UPDATE exercises SET based_on = NULL WHERE spond_group_id = $1 AND based_on = $2", [
            bank,
            gone[0].code
        ]);
    });
}
async function savePlanExercise(d, access, groupId, e, themes, source, extra = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const bank = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"];
    const known = await d.query("SELECT code, based_on FROM exercises WHERE spond_group_id = $1 AND code IN ($2, $3)", [
        bank,
        e.kode,
        e.basert_pa
    ]);
    if (known.some((k)=>k.code === e.kode)) return null;
    const base = known.find((k)=>k.code === e.basert_pa);
    const basedOn = !e.basert_pa || !base ? null : base.based_on || e.basert_pa;
    // A variant is meant to be like its base; anything else must not be too much like an exercise in the bank.
    if (!basedOn) {
        const like = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["tooSimilar"])({
            name: e.navn,
            category: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["categoryKey"])(e.kategori),
            themes,
            organisation: e.organisering,
            execution: e.gjennomforing,
            drawing: e.tegning
        }, await listExercises(d, access, groupId));
        if (like) throw new TooSimilarError(like);
    }
    const taken = (await d.query("SELECT code FROM exercises WHERE spond_group_id = $1", [
        bank
    ])).map((r)=>r.code);
    const code = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["CODE_RE"].test(e.kode) && e.kode.length <= 60 ? e.kode : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["exerciseCode"])(e.navn, taken);
    const bands = extra.bands ?? await teamBands(d, groupId);
    const join = (x)=>x.join("\n");
    const [{ id }] = await d.query(`INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, questions,
                            easier, harder, nff_url, drawing, source, created_by, updated_by, based_on, status,
                            min_players, max_players, duration_minutes, area, bands, nff_activity, nff_tags)
     VALUES ($1, $2, $3, $4, $5::text[], NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''),
             NULLIF($11, ''), NULLIF($12, ''), $13::jsonb, $14, $15, $15, $16, 'candidate', $17, $18, $19, NULLIF($20, ''),
             $21::text[], NULLIF($22, ''), $23::text[])
     RETURNING id`, [
        bank,
        code,
        e.navn.slice(0, 80),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["categoryKey"])(e.kategori),
        themes.filter(Boolean).slice(0, 10),
        join(e.organisering).slice(0, 2000),
        join(e.gjennomforing).slice(0, 2000),
        join(e.laeringsmomenter).slice(0, 2000),
        join(e.sporsmal).slice(0, 2000),
        e.enklere.slice(0, 1000),
        e.vanskeligere.slice(0, 1000),
        e.nff_url,
        e.tegning ? JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$drawing$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["compactDrawing"])(e.tegning)) : null,
        source,
        access.profileId,
        basedOn,
        extra.min_players ?? null,
        extra.max_players ?? null,
        extra.duration_minutes ?? null,
        (extra.area ?? "").slice(0, 60),
        bands,
        e.aktivitet ?? "",
        e.nff_tags ?? []
    ]);
    return id;
}
/** The NFF band the team is in this year, from its birth year (none if unknown or over 12). */ async function teamBands(d, groupId) {
    const [row] = await d.query("SELECT birth_year FROM team_settings WHERE spond_group_id = $1", [
        groupId
    ]);
    const band = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$nff$2f$bands$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["teamBand"])(row?.birth_year ?? null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["osloParts"])(new Date()).year);
    return band ? [
        band
    ] : [];
}
async function planVersions(d, access, groupId, eventId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return d.query(`SELECT id, version, status, source, plan->>'tittel' AS title, created_by, created_at, approved_by, approved_at
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2 AND status <> 'deleted'
      ORDER BY version DESC`, [
        groupId,
        eventId
    ]);
}
async function latestPlans(d, access, groupId, eventIds) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!eventIds.length) return [];
    return d.query(`SELECT spond_event_id, max(version)::int AS version, bool_or(status = 'approved') AS approved
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[]) AND status <> 'deleted'
      GROUP BY spond_event_id`, [
        groupId,
        eventIds
    ]);
}
async function previousPlan(d, access, groupId, eventIds) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!eventIds.length) return null;
    const rows = await d.query(`SELECT DISTINCT ON (spond_event_id) id, spond_event_id, plan->>'tittel' AS title
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[]) AND status <> 'deleted'
      ORDER BY spond_event_id, (status = 'approved') DESC, version DESC`, [
        groupId,
        eventIds
    ]);
    for (const eventId of eventIds){
        const r = rows.find((x)=>x.spond_event_id === eventId);
        if (r) return {
            id: r.id,
            eventId,
            title: r.title
        };
    }
    return null;
}
async function getPlan(d, access, id) {
    const rows = await d.query(`SELECT id, spond_group_id, spond_event_id, version, status, source, model, cost_usd::float8 AS cost_usd,
            created_by, created_at, approved_by, approved_at, plan::text AS plan, context->>'kind' AS kind
       FROM training_plans WHERE id = $1 AND status <> 'deleted'`, [
        id
    ]);
    if (!rows.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke opplegget.");
    const r = rows[0];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, r.spond_group_id);
    return {
        id: r.id,
        groupId: r.spond_group_id,
        eventId: r.spond_event_id,
        version: r.version,
        status: r.status,
        source: r.source,
        model: r.model ?? "",
        costUsd: r.cost_usd,
        createdBy: r.created_by,
        createdAt: new Date(r.created_at),
        approvedBy: r.approved_by,
        approvedAt: r.approved_at ? new Date(r.approved_at) : null,
        plan: wrap(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validatePlan"])(JSON.parse(r.plan))),
        kind: r.kind ?? null
    };
}
async function savePlan(d, access, groupId, eventId, plan, opts = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!eventId) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Mangler arrangement.");
    const json = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["planJson"])(wrap(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$plans$2f$plan$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validatePlan"])(plan)));
    // The event's time, so a reminder to evaluate can be sent after it (without Spond).
    const insert = ()=>d.query(`INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, source, created_by, model, cost_usd, event_start, event_end, context)
       SELECT $1, $2, coalesce(max(version), 0) + 1, $3::jsonb, $4, $5, NULLIF($6, ''), $7, $8::timestamptz, $9::timestamptz, $10::jsonb
         FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2
       RETURNING id, version`, [
            groupId,
            eventId,
            json,
            opts.source ?? "manual",
            access.profileId,
            opts.model ?? "",
            opts.costUsd ?? null,
            opts.eventStart ?? null,
            opts.eventEnd ?? null,
            opts.context ? JSON.stringify(opts.context) : null
        ]);
    try {
        return (await insert())[0];
    } catch (err) {
        if (!/duplicate key|unique/i.test(err.message)) throw err;
        return (await insert())[0];
    }
}
async function lastPlanPitches(d, access, groupId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const rows = await d.query(`SELECT context->'pitches' AS pitches FROM training_plans
      WHERE spond_group_id = $1 AND status <> 'deleted' AND jsonb_typeof(context->'pitches') = 'array' AND jsonb_array_length(context->'pitches') > 0
      ORDER BY created_at DESC, id DESC LIMIT 1`, [
        groupId
    ]);
    const v = rows[0]?.pitches;
    const list = typeof v === "string" ? JSON.parse(v) : v;
    return Array.isArray(list) ? list.filter((x)=>Number.isInteger(x)) : [];
}
async function approvePlan(d, access, id) {
    const pl = await getPlan(d, access, id);
    await d.tx(async (t)=>{
        await t.query(`UPDATE training_plans SET status = 'draft', approved_by = NULL, approved_at = NULL
        WHERE spond_group_id = $1 AND spond_event_id = $2 AND status = 'approved' AND id <> $3`, [
            pl.groupId,
            pl.eventId,
            id
        ]);
        await t.query("UPDATE training_plans SET status = 'approved', approved_by = $2, approved_at = now() WHERE id = $1 AND status IN ('draft', 'approved')", [
            id,
            access.profileId
        ]);
    });
    return pl;
}
async function unapprovePlan(d, access, id) {
    await getPlan(d, access, id);
    await d.query("UPDATE training_plans SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = $1 AND status = 'approved'", [
        id
    ]);
}
async function listPlanComments(d, access, groupId, eventId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return d.query(`SELECT c.id, c.plan_id, p.version, c.exercise_no, coalesce(c.exercise_code, '') AS exercise_code, c.author, c.body,
            c.created_at, c.used_in_plan_id, u.version AS used_in_version
       FROM training_plan_comments c
       JOIN training_plans p ON p.id = c.plan_id
       LEFT JOIN training_plans u ON u.id = c.used_in_plan_id
      WHERE c.spond_group_id = $1 AND c.spond_event_id = $2 AND p.status <> 'deleted'
      ORDER BY c.created_at, c.id`, [
        groupId,
        eventId
    ]);
}
async function addPlanComment(d, access, planId, body, exerciseNo) {
    const pl = await getPlan(d, access, planId);
    const problem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["commentProblem"])(body, 1000);
    if (problem) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"](problem);
    let code = "";
    if (exerciseNo !== null) {
        if (exerciseNo < 1 || exerciseNo > pl.plan.ovelser.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Ukjent øvelse.");
        code = pl.plan.ovelser[exerciseNo - 1].kode;
    }
    await d.query(`INSERT INTO training_plan_comments (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, author, body)
     VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)`, [
        pl.groupId,
        pl.eventId,
        planId,
        exerciseNo,
        code,
        access.profileId,
        body.trim()
    ]);
}
async function deletePlanComment(d, access, groupId, commentId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const n = await d.query("DELETE FROM training_plan_comments WHERE id = $1 AND spond_group_id = $2 AND author = $3 AND used_in_plan_id IS NULL RETURNING id", [
        commentId,
        groupId,
        access.profileId
    ]);
    if (!n.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Kan bare slette egne kommentarer som ikke er brukt av KI.");
}
async function markCommentsUsed(d, access, groupId, ids, planId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    if (!ids.length) return;
    await d.query("UPDATE training_plan_comments SET used_in_plan_id = $3 WHERE spond_group_id = $1 AND id = ANY($2::int[]) AND used_in_plan_id IS NULL", [
        groupId,
        ids,
        planId
    ]);
}
async function listFeedback(d, access, groupId, eventId) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return d.query(`SELECT id, plan_id, exercise_no, coalesce(exercise_code, '') AS exercise_code, rating, tags, actual_minutes, actual_players,
            coalesce(body, '') AS body, coalesce(use_again, '') AS use_again, author, updated_at
       FROM exercise_feedback WHERE spond_group_id = $1 AND spond_event_id = $2
      ORDER BY plan_id, exercise_no NULLS FIRST, updated_at, id`, [
        groupId,
        eventId
    ]);
}
async function saveFeedback(d, access, planId, rows, registered, /** The subgroups the event was sent to in Spond; none is the whole group. */ subgroupIds = []) {
    const pl = await getPlan(d, access, planId);
    if (!rows.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Vurder minst én øvelse eller hele økta.");
    return d.tx(async (t)=>{
        await t.query("DELETE FROM exercise_feedback WHERE plan_id = $1 AND author = $2", [
            planId,
            access.profileId
        ]);
        for (const r of rows){
            await t.query(`INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, rating, tags,
                                        actual_minutes, actual_players, body, use_again, author, registered_players, spond_subgroup_ids,
                                        exercise_version)
         VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7::text[], $8, $9, NULLIF($10, ''), NULLIF($11, ''), $12, $13, $14::text[],
                 -- The version the plan had: the newest one made before the plan.
                 coalesce((SELECT max(v.version) FROM exercise_versions v
                            WHERE v.spond_group_id = '${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]}' AND v.exercise_code = NULLIF($5, '')
                              AND v.created_at <= (SELECT created_at FROM training_plans WHERE id = $3)), 1))`, [
                pl.groupId,
                pl.eventId,
                planId,
                r.exercise_no,
                r.exercise_code,
                r.rating,
                r.tags,
                r.actual_minutes,
                r.actual_players,
                r.body,
                r.use_again,
                access.profileId,
                r.exercise_no === null ? registered : null,
                subgroupIds
            ]);
        }
        const good = [
            ...new Set(rows.filter((r)=>r.exercise_no !== null && r.rating === 3 && r.use_again === "yes" && r.exercise_code).map((r)=>r.exercise_code))
        ];
        if (!good.length) return [];
        const act = await t.query(`UPDATE exercises SET status = 'active', updated_by = $3, updated_at = now()
        WHERE spond_group_id = $1 AND code = ANY($2::text[]) AND status = 'candidate' RETURNING code`, [
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
            good,
            access.profileId
        ]);
        return act.map((a)=>a.code);
    });
}
async function myBankFeedback(d, access, groupId, exerciseCode) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const r = await d.query(`SELECT id, plan_id, exercise_no, exercise_code, rating, tags, actual_minutes, actual_players,
            coalesce(body, '') AS body, coalesce(use_again, '') AS use_again, author, updated_at
       FROM exercise_feedback WHERE spond_group_id = $1 AND exercise_code = $2 AND author = $3 AND plan_id IS NULL`, [
        groupId,
        exerciseCode,
        access.profileId
    ]);
    return r[0] ?? null;
}
async function saveBankFeedback(d, access, groupId, exerciseId, row, /** The teams the trainer has, so the evaluation counts for their age band. */ subgroupIds = []) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const ex = await d.query("SELECT code FROM exercises WHERE id = $1 AND spond_group_id = $2", [
        exerciseId,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]
    ]);
    if (!ex.length) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Fant ikke øvelsen.");
    const code = ex[0].code;
    return d.tx(async (t)=>{
        await t.query("DELETE FROM exercise_feedback WHERE spond_group_id = $1 AND exercise_code = $2 AND author = $3 AND plan_id IS NULL", [
            groupId,
            code,
            access.profileId
        ]);
        if (!row) return false;
        await t.query(`INSERT INTO exercise_feedback (spond_group_id, exercise_code, rating, tags, actual_minutes, body, use_again, author, exercise_version, spond_subgroup_ids)
       VALUES ($1, $2, $3, $4::text[], $5, NULLIF($6, ''), NULLIF($7, ''), $8,
               (SELECT version FROM exercises WHERE spond_group_id = '${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]}' AND code = $2), $9::text[])`, [
            groupId,
            code,
            row.rating,
            row.tags,
            row.actual_minutes,
            row.body,
            row.use_again,
            access.profileId,
            subgroupIds
        ]);
        if (row.rating !== 3 || row.use_again !== "yes") return false;
        const act = await t.query(`UPDATE exercises SET status = 'active', updated_by = $3, updated_at = now()
        WHERE id = $1 AND spond_group_id = $2 AND status = 'candidate' RETURNING id`, [
            exerciseId,
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"],
            access.profileId
        ]);
        return act.length > 0;
    });
}
async function teamExperience(d, access, groupId, since) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const [row] = await d.query(`WITH f AS (SELECT * FROM exercise_feedback WHERE spond_group_id = $1 AND created_at > $2::timestamptz)
     SELECT (SELECT count(*) FROM f WHERE exercise_no IS NOT NULL OR plan_id IS NULL)::int AS n_eval,
            t.time_n, t.time_sessions, t.time_diff, a.att_sessions, a.att_ratio,
            (SELECT string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag)
               FROM (SELECT tag, count(*) AS n FROM f, unnest(f.tags) AS tag WHERE f.exercise_no IS NOT NULL OR f.plan_id IS NULL GROUP BY tag) g) AS tags
       FROM (SELECT count(*)::int AS time_n, count(DISTINCT f.spond_event_id)::int AS time_sessions,
                    avg(f.actual_minutes - (p.plan->'tidsplan'->'stasjoner'->>'minutter')::int)::float8 AS time_diff
               FROM f JOIN training_plans p ON p.id = f.plan_id
              WHERE f.exercise_no IS NOT NULL AND f.actual_minutes IS NOT NULL
                AND jsonb_typeof(p.plan->'tidsplan'->'stasjoner'->'minutter') = 'number') t,
            (SELECT count(*)::int AS att_sessions, avg(r)::float8 AS att_ratio
               FROM (SELECT spond_event_id, avg(actual_players::float8 / registered_players) AS r
                       FROM f WHERE exercise_no IS NULL AND actual_players IS NOT NULL AND registered_players > 0
                      GROUP BY spond_event_id) e) a`, [
        groupId,
        since.toISOString()
    ]);
    const tags = {};
    for (const part of (row.tags ?? "").split(",").filter(Boolean)){
        const [k, n] = part.split(":");
        tags[k] = Number(n);
    }
    return {
        ...row,
        tags
    };
}
const LEARNING_MAX = 3000;
async function learningState(d, access, groupId, sub, n = 6) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const { versions: v, inherited } = await versions(d, "team_learnings", "id, body, source, created_by, created_at", groupId, sub, n);
    const [{ since }] = await d.query("SELECT max(created_at) AS since FROM team_learnings WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND source = 'ai'", [
        groupId,
        inherited ? "" : sub
    ]);
    const [{ n: nNew }] = await d.query(`SELECT count(*)::int AS n FROM exercise_feedback f
      WHERE f.spond_group_id = $1 AND ${FEEDBACK_IN_SCOPE} AND ($3::timestamptz IS NULL OR f.updated_at > $3::timestamptz)`, [
        groupId,
        sub,
        since ? new Date(since).toISOString() : null
    ]);
    return {
        versions: v,
        inherited,
        nNew,
        since: since ? new Date(since) : null
    };
}
async function latestLearning(d, access, groupId, sub) {
    return (await learningState(d, access, groupId, sub, 1)).versions[0]?.body ?? "";
}
async function saveLearning(d, access, groupId, sub, body, source) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    const b = body.trim();
    if (!b || b.length > LEARNING_MAX) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"](`Lærdommene må ha mellom 1 og ${LEARNING_MAX} tegn.`);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(b)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Lærdommene skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    await d.query("INSERT INTO team_learnings (spond_group_id, spond_subgroup_id, body, source, created_by) VALUES ($1, $2, $3, $4, $5)", [
        groupId,
        sub,
        b,
        source,
        access.profileId
    ]);
}
async function feedbackSince(d, access, groupId, sub, since, max = 150) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return d.query(`SELECT * FROM (
       SELECT coalesce(f.spond_event_id, '') AS spond_event_id, f.exercise_no,
              coalesce(p.plan->'ovelser'->(f.exercise_no - 1)->>'navn', e.name, '') AS exercise_name,
              coalesce(p.plan->>'tema', '') AS theme,
              CASE WHEN jsonb_typeof(p.plan->'tidsplan'->'stasjoner'->'minutter') = 'number'
                   THEN (p.plan->'tidsplan'->'stasjoner'->>'minutter')::int END AS planned_minutes,
              f.rating, f.tags, f.actual_minutes, f.actual_players, f.registered_players,
              coalesce(f.body, '') AS body, coalesce(f.use_again, '') AS use_again, f.created_at, f.updated_at, f.id
         FROM exercise_feedback f LEFT JOIN training_plans p ON p.id = f.plan_id
         LEFT JOIN exercises e ON f.plan_id IS NULL AND e.spond_group_id = '${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]}' AND e.code = f.exercise_code
        WHERE f.spond_group_id = $1 AND ${FEEDBACK_IN_SCOPE} AND f.updated_at > $3::timestamptz
        ORDER BY f.updated_at DESC, f.id DESC LIMIT $4) x
      ORDER BY created_at, spond_event_id, exercise_no NULLS FIRST, id`, [
        groupId,
        sub,
        since.toISOString(),
        max
    ]);
}
;
}),
"[project]/lib/store/versions.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exerciseVersions",
    ()=>exerciseVersions,
    "recordVersion",
    ()=>recordVersion,
    "versionsToMeasure",
    ()=>versionsToMeasure
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/bank.ts [instrumentation] (ecmascript)");
;
;
async function recordVersion(d, groupId, code, change) {
    await d.query(`INSERT INTO exercise_versions (spond_group_id, exercise_code, version, vals, source, created_by)
     VALUES ($1, $2, $3, $4::jsonb, 'tidligere', $5) ON CONFLICT DO NOTHING`, [
        groupId,
        code,
        change.beforeVersion,
        JSON.stringify(change.before),
        change.actor
    ]);
    const [r] = await d.query("UPDATE exercises SET version = version + 1 WHERE spond_group_id = $1 AND code = $2 RETURNING version", [
        groupId,
        code
    ]);
    await d.query(`INSERT INTO exercise_versions (spond_group_id, exercise_code, version, vals, source, proposal_id, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7) ON CONFLICT (spond_group_id, exercise_code, version) DO UPDATE SET vals = EXCLUDED.vals`, [
        groupId,
        code,
        r.version,
        JSON.stringify(change.after),
        change.source,
        change.proposalId ?? null,
        change.actor
    ]);
    return r.version;
}
async function stats(d, groupId, code) {
    return d.query(`WITH f AS (SELECT exercise_version AS version, count(rating)::int AS n, avg(rating)::float8 AS mean
                  FROM exercise_feedback
                 WHERE exercise_code = $2 AND (exercise_no IS NOT NULL OR plan_id IS NULL)
                 GROUP BY 1)
     SELECT v.version, v.source, coalesce(f.n, 0) AS n, f.mean, v.created_at, v.created_by, v.vals
       FROM exercise_versions v LEFT JOIN f ON f.version = v.version
      WHERE v.spond_group_id = $1 AND v.exercise_code = $2
      ORDER BY v.version DESC`, [
        groupId,
        code
    ]);
}
async function exerciseVersions(d, access, groupId, code) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["assertGroup"])(access, groupId);
    return stats(d, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"], code);
}
async function versionsToMeasure(d) {
    const rows = await d.query(`SELECT e.id, e.code, e.version FROM exercises e
       JOIN exercise_versions v ON v.spond_group_id = e.spond_group_id AND v.exercise_code = e.code AND v.version = e.version
      WHERE e.spond_group_id = $1 AND v.source IN ('forbedring', 'automatisk')`, [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"]
    ]);
    return Promise.all(rows.map(async (r)=>({
            ...r,
            stats: await stats(d, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$bank$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["BANK"], r.code)
        })));
}
}),
]})(),
"[project]/lib/plans/reference-plan.json.[json].cjs [instrumentation] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = JSON.parse("{\"versjon\":1,\"tittel\":\"Samhandling – spille på lag\",\"undertittel\":\"Treningsøkt for gutter 10 år · tre stasjoner, tre grupper · ca. 65 min\",\"tema\":\"Samhandling – spille på lag\",\"fokus\":{\"forsvar\":\"Når vi mister ballen, kommer vi ikke hjem bak ballen.\",\"angrep\":\"Ballfører har få pasningsalternativer – vi beveger oss for lite i rom.\"},\"stikkord\":[{\"tittel\":\"Gi ballfører to valg\",\"tekst\":\"Ut av pasningsskyggen – én på hver side.\"},{\"tittel\":\"Ballen flytter seg – vi flytter oss\",\"tekst\":\"Støtt bak, løp forbi, løp i rom.\"},{\"tittel\":\"Mistet ball? Hjem bak ballen!\",\"tekst\":\"Kortest vei mot eget mål.\"}],\"stikkord_merknad\":\"Bruk de samme ordene på alle stasjonene, så kjenner guttene dem igjen – og bruk dem i kamp.\",\"tidsplan\":{\"oppvarming\":{\"minutter\":8,\"tekst\":\"Felles samling og oppvarming (f.eks. pasningskaos: rop navn før pasning)\"},\"stasjoner\":{\"minutter\":15,\"bytte\":2,\"grupper\":3},\"avslutning\":{\"minutter\":8,\"tekst\":\"Felles avslutning: to spørsmål til hele gruppa (se under)\"},\"merknad\":\"15 minutter per stasjon, 2 minutter til bytte. Én trener per stasjon som blir på sin stasjon hele økta. Planen er laget for ca. 24 spillere (3 grupper à 8); se «Tilpasning» på hver øvelse hvis dere er flere eller færre.\"},\"avslutning_sporsmal\":[\"«Hva kan du gjøre for å hjelpe den som har ballen?»\",\"«Hva gjør vi alle sammen i det øyeblikket vi mister ballen?»\",\"Be noen gutter vise det på banen. Ros konkrete eksempler du så på stasjonene.\"],\"kilde\":\"Læringsmomentene bygger på NFFs fagplan for 10–12 år: «være spillbar – ut av pasningsskyggen», «bevegelse bak, forbi og foran ballfører for å skaffe flere pasningsalternativ» og å hjelpe laget å samle seg bak ballen.\",\"ovelser\":[{\"kode\":\"3-mot-1-alltid-to-alternativer\",\"navn\":\"3 mot 1 – alltid to alternativer\",\"kategori\":\"Spille med og mot\",\"fokus\":\"Være spillbar – ut av pasningsskyggen. Ballfører skal alltid ha to å spille til.\",\"organisering\":[\"To ruter à 12 × 12 m ved siden av hverandre.\",\"3 blå mot 1 rød i hver rute (8 spillere).\",\"Én ball per rute, ekstraballer i hjørnene.\"],\"gjennomforing\":[\"De tre holder ballen mot forsvareren. 5 pasninger på rad = 1 poeng.\",\"Vinner forsvareren ballen, eller ballen går ut, bytter han med den som slo pasningen.\",\"Bytt forsvarer uansett hvert 60. sekund, så alle får prøve.\",\"Etter 6–7 min: slå sammen rutene til én rute 15 × 15 m og spill 6 mot 2.\"],\"tilpasning\":[\"Flere spillere: lag en tredje rute. Færre: 4 mot 2 i én rute.\"],\"laeringsmomenter\":[\"**Uten ball:** Stå der ballfører kan se deg – ikke bak forsvareren.\",\"Én på hver side av ballfører, så vi lager en trekant.\",\"Hver gang ballen flytter seg, flytter du deg.\",\"**Med ball:** Se opp før du får ballen, og ta imot slik at du ser begge medspillerne.\"],\"sporsmal\":[\"«Kan ballfører spille til deg nå?»\",\"«Hva skjer når forsvareren står mellom deg og ballen?»\",\"«Hvor mange kan ballfører spille til akkurat nå?»\"],\"enklere\":\"Større rute (15 × 15 m), fri touch, forsvarer går halvt tempo.\",\"vanskeligere\":\"Maks to touch. Ikke lov å spille tilbake til den du fikk ballen fra. 6 mot 2 i felles rute.\",\"tegning\":{\"skisser\":[{\"tittel\":\"A: Alltid to alternativer\",\"bane\":{\"bredde\":12,\"lengde\":12,\"marg\":2.5},\"objekter\":[{\"type\":\"kjegle\",\"x\":0,\"y\":0},{\"type\":\"kjegle\",\"x\":12,\"y\":0},{\"type\":\"kjegle\",\"x\":0,\"y\":12},{\"type\":\"kjegle\",\"x\":12,\"y\":12},{\"type\":\"spiller\",\"lag\":1,\"x\":1.0,\"y\":9.5,\"tekst\":\"2\"},{\"type\":\"spiller\",\"lag\":1,\"x\":1.5,\"y\":1.2,\"tekst\":\"1\"},{\"type\":\"ball\",\"x\":2.5,\"y\":1.9},{\"type\":\"spiller\",\"lag\":2,\"x\":5.4,\"y\":1.6,\"tekst\":\"F\"},{\"type\":\"spiller\",\"lag\":1,\"x\":8.9,\"y\":1.1,\"tekst\":\"3\"}],\"piler\":[{\"type\":\"pasning\",\"fra\":[2.5,1.9],\"til\":[9.7,7.2]},{\"type\":\"lop\",\"fra\":[8.9,1.1],\"til\":[10.6,6.9],\"bue\":0.25}],\"tekster\":[{\"x\":14.25,\"y\":-1.4,\"tekst\":\"Rute 12 × 12 m  ·  3 mot 1 i hver rute\"}]},{\"tittel\":\"B: Ballen flyttes – vi flytter oss\",\"bane\":{\"bredde\":12,\"lengde\":12,\"marg\":2.5},\"objekter\":[{\"type\":\"kjegle\",\"x\":0,\"y\":0},{\"type\":\"kjegle\",\"x\":12,\"y\":0},{\"type\":\"kjegle\",\"x\":0,\"y\":12},{\"type\":\"kjegle\",\"x\":12,\"y\":12},{\"type\":\"spiller\",\"lag\":1,\"x\":6.5,\"y\":11.0,\"tekst\":\"2\"},{\"type\":\"spiller\",\"lag\":2,\"x\":6.5,\"y\":5.8,\"tekst\":\"F\"},{\"type\":\"spiller\",\"lag\":1,\"x\":10.9,\"y\":6.0,\"tekst\":\"1\"},{\"type\":\"ball\",\"x\":10.2,\"y\":6.8},{\"type\":\"spiller\",\"lag\":1,\"x\":2.5,\"y\":5.0,\"tekst\":\"3\"}],\"piler\":[{\"type\":\"lop\",\"fra\":[6.5,11.0],\"til\":[9.5,11.2]},{\"type\":\"lop\",\"fra\":[2.5,5.0],\"til\":[5.1,1.5],\"bue\":0.2}]}]}},{\"kode\":\"hjem-bak-ballen\",\"navn\":\"Hjem bak ballen\",\"kategori\":\"Overgang – angrep og forsvar\",\"fokus\":\"Når vi mister ballen, sprinter vi hjem bak ballen før vi presser.\",\"organisering\":[\"Bane ca. 32 × 22 m. Stort mål med keeper i én ende, to småmål i den andre.\",\"Blå: 3 angripere. Rød: keeper, 2 forsvarere og 1 hjemløper (H) som starter ved siden av angriperne.\",\"Trener står ved småmålene med baller.\"],\"gjennomforing\":[\"Treneren spiller ballen inn til blå. I samme øyeblikk sprinter H hjem – forbi ballen og inn i forsvaret.\",\"Blå prøver å score raskt mens de har 3 mot 2.\",\"Vinner rød ballen, kontrer de mot småmålene – og da må **alle** blå sprinte hjem bak ballen.\",\"Ny ball fra trener etter hvert angrep. Bytt roller etter 4–5 angrep, så alle får være hjemløper.\"],\"tilpasning\":[\"8 spillere: 3 + 3 + keeper + 1 som bytter inn. Trener kan stå i mål hvis ingen vil.\",\"Flere: to hjemløpere, én på hver side.\"],\"laeringsmomenter\":[\"**Mistet ball:** Løp korteste vei mot eget mål – ikke mot ballen.\",\"Kom bak ballen først, så kan du hjelpe.\",\"Nærmeste spiller presser ballfører, de andre sikrer og samler seg bak.\",\"Snakk sammen: «Jeg tar’n!» – «Jeg sikrer!»\",\"**Angrep:** Bruk overtallet raskt, før hjemløperen kommer.\"],\"sporsmal\":[\"«Hvor er det lurt å løpe når vi mister ballen?»\",\"«Hvorfor hjelper det å komme bak ballen?»\",\"«Hvem skal presse, og hvem skal sikre?»\"],\"enklere\":\"La H starte litt nærmere eget mål, så det fort blir 3 mot 3.\",\"vanskeligere\":\"Blå må score innen 8 sekunder. Kontringsmål teller dobbelt hvis det scores før alle blå er bak ballen.\",\"tegning\":{\"skisser\":[{\"bane\":{\"bredde\":32,\"lengde\":22,\"marg\":2.5,\"midtlinje\":true},\"hjelpelinjer\":[{\"fra\":[19.7,0],\"til\":[19.7,22],\"tekst\":\"ball-linjen\"}],\"objekter\":[{\"type\":\"maal\",\"x\":0,\"y\":11,\"bredde\":5,\"side\":\"venstre\"},{\"type\":\"smaamaal\",\"x\":32,\"y\":17,\"bredde\":2,\"side\":\"hoyre\"},{\"type\":\"smaamaal\",\"x\":32,\"y\":5,\"bredde\":2,\"side\":\"hoyre\"},{\"type\":\"spiller\",\"lag\":2,\"x\":1.2,\"y\":11.0,\"tekst\":\"K\"},{\"type\":\"spiller\",\"lag\":2,\"x\":7.5,\"y\":14.5,\"tekst\":\"R\"},{\"type\":\"spiller\",\"lag\":2,\"x\":7.5,\"y\":7.5,\"tekst\":\"R\"},{\"type\":\"spiller\",\"lag\":2,\"x\":26.9,\"y\":20.4,\"tekst\":\"H\"},{\"type\":\"spiller\",\"lag\":1,\"x\":21.9,\"y\":16.0,\"tekst\":\"B\"},{\"type\":\"spiller\",\"lag\":1,\"x\":21.5,\"y\":11.0,\"tekst\":\"B\"},{\"type\":\"spiller\",\"lag\":1,\"x\":21.9,\"y\":4.0,\"tekst\":\"B\"},{\"type\":\"ball\",\"x\":20.0,\"y\":11.0},{\"type\":\"trener\",\"x\":30.9,\"y\":11.0}],\"piler\":[{\"type\":\"lop\",\"fra\":[26.9,20.4],\"til\":[9.0,19.5]},{\"type\":\"lop\",\"fra\":[21.9,16.0],\"til\":[13.6,15.6]},{\"type\":\"lop\",\"fra\":[21.9,4.0],\"til\":[13.6,3.6]},{\"type\":\"foring\",\"fra\":[20.0,11.0],\"til\":[14.6,11.1]},{\"type\":\"pasning\",\"fra\":[30.9,11.0],\"til\":[21.5,11.0]}],\"etiketter\":[{\"x\":26.4,\"y\":7.5,\"tekst\":\"H sprinter forbi ballen og hjem\"}],\"tekster\":[{\"x\":4.6,\"y\":-1.4,\"tekst\":\"Mål + keeper\"},{\"x\":16,\"y\":-1.4,\"tekst\":\"ca. 32 × 22 m\"},{\"x\":27.6,\"y\":-1.4,\"tekst\":\"To småmål\"}]}]}},{\"kode\":\"4-mot-4-med-endesoner\",\"navn\":\"4 mot 4 med endesoner\",\"kategori\":\"Smålagsspill\",\"fokus\":\"Bevegelse i rom – én støtter, én løper forbi. Mistet ball: alle hjem bak ballen.\",\"organisering\":[\"Bane ca. 32 × 22 m med en 4 m endesone i hver ende.\",\"4 mot 4, ingen keepere.\",\"Trener med baller på sidelinja.\"],\"gjennomforing\":[\"Mål: pass til en medspiller som **løper inn** i motstanderens endesone og tar imot.\",\"Ikke lov å stå og vente i sonen eller føre ballen inn.\",\"Etter mål starter det andre laget med ball fra egen endesone.\",\"Trener roper «Frys!» rett etter et balltap: alle står stille. Se sammen hvem som er foran ballen og må hjem, og hvor mange alternativer ballfører har.\"],\"tilpasning\":[\"Flere: 5 mot 5 på litt større bane. Færre: 3 mot 3 med joker.\"],\"laeringsmomenter\":[\"**I angrep:** Bevegelse bak, forbi og foran ballfører – flere pasningsalternativer.\",\"Gjør banen stor: bruk hele bredden og lengden.\",\"Spill og flytt deg. Start løpet i rom når ballfører kan se deg.\",\"**I forsvar:** Mistet ball – alle hjem bak ballen. Nærmeste presser.\"],\"sporsmal\":[\"«Hvem kan løpe i rommet nå?»\",\"«Hvor mange kan ballfører spille til?» (i frys-bildet)\",\"«Hvem er foran ballen og må hjem?»\"],\"enklere\":\"Én joker som alltid spiller med laget som har ballen (5 mot 4).\",\"vanskeligere\":\"Maks tre touch. Bonuspoeng hvis laget vinner ballen tilbake innen 5 sekunder etter balltap.\",\"tegning\":{\"skisser\":[{\"bane\":{\"bredde\":32,\"lengde\":22,\"marg\":2.5},\"soner\":[{\"x\":0,\"y\":0,\"b\":4,\"h\":22,\"tekst\":\"Endesone 4 m\"},{\"x\":28,\"y\":0,\"b\":4,\"h\":22,\"tekst\":\"Endesone 4 m\"}],\"objekter\":[{\"type\":\"kjegle\",\"x\":4,\"y\":0,\"farge\":\"gul\"},{\"type\":\"kjegle\",\"x\":28,\"y\":0,\"farge\":\"gul\"},{\"type\":\"kjegle\",\"x\":4,\"y\":22,\"farge\":\"gul\"},{\"type\":\"kjegle\",\"x\":28,\"y\":22,\"farge\":\"gul\"},{\"type\":\"spiller\",\"lag\":1,\"x\":11.0,\"y\":17.0,\"tekst\":\"2\"},{\"type\":\"spiller\",\"lag\":1,\"x\":19.0,\"y\":15.0,\"tekst\":\"3\"},{\"type\":\"spiller\",\"lag\":1,\"x\":13.9,\"y\":9.0,\"tekst\":\"1\"},{\"type\":\"spiller\",\"lag\":1,\"x\":23.0,\"y\":4.0,\"tekst\":\"4\"},{\"type\":\"ball\",\"x\":15.0,\"y\":9.5},{\"type\":\"spiller\",\"lag\":2,\"x\":20.9,\"y\":12.5},{\"type\":\"spiller\",\"lag\":2,\"x\":25.5,\"y\":11.5},{\"type\":\"spiller\",\"lag\":2,\"x\":16.96,\"y\":8.0},{\"type\":\"spiller\",\"lag\":2,\"x\":10.0,\"y\":6.0}],\"piler\":[{\"type\":\"lop\",\"fra\":[11.0,17.0],\"til\":[12.7,13.9]},{\"type\":\"lop\",\"fra\":[19.0,15.0],\"til\":[22.5,17.6]},{\"type\":\"pasning\",\"fra\":[15.0,9.5],\"til\":[28.9,7.1]},{\"type\":\"lop\",\"fra\":[10.0,6.0],\"til\":[16.96,5.8],\"bue\":-0.15},{\"type\":\"lop\",\"fra\":[23.0,4.0],\"til\":[29.5,6.1],\"bue\":0.2}],\"etiketter\":[{\"x\":10.0,\"y\":3.5,\"tekst\":\"Hjem bak ballen!\"}],\"tekster\":[{\"x\":16,\"y\":-1.4,\"tekst\":\"ca. 32 × 22 m\"}]}]}}]}");
}),
];

//# sourceMappingURL=lib_0zbihz1tfuvz6._.js.map