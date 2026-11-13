import type { CSSProperties } from "react";
import { drawingShapes, type Drawing, type Shape } from "@/lib/plans/drawing";

/** One shape from `drawingShapes` as SVG. */
export function ShapeSvg({ s }: { s: Shape }) {
  switch (s.k) {
    case "rect":
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} opacity={s.opacity} />;
    case "circle":
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} />;
    case "poly": {
      const pts = s.points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      const common = { fill: s.fill ?? "none", stroke: s.stroke, strokeWidth: s.sw, strokeDasharray: s.dash?.join(" "), strokeLinejoin: "round" as const };
      return s.closed ? <polygon points={pts} {...common} /> : <polyline points={pts} {...common} />;
    }
    case "text":
      return (
        <text x={s.x} y={s.y + s.size * 0.35} fontSize={s.size} fill={s.fill} fontWeight={s.bold ? 700 : 400} textAnchor={s.anchor ?? "middle"} fontFamily="Barlow, system-ui, sans-serif">
          {s.text}
        </text>
      );
  }
}

/** A list of shapes. */
export function Shapes({ shapes }: { shapes: Shape[] }) {
  return (
    <>
      {shapes.map((s, i) => (
        <ShapeSvg key={i} s={s} />
      ))}
    </>
  );
}

/**
 * The box a full-size drawing sits in: as wide as the page, but never so tall
 * that it fills the screen on a PC (the player's buttons sit on the picture).
 */
export function fitStyle(width: number, height: number): CSSProperties {
  return { "--ratio": (width / height).toFixed(3) } as CSSProperties;
}

/** A drawing as inline SVG (scales to its container). `fit` caps its height to the screen. */
export function DrawingSvg({ drawing, title, fit }: { drawing: Drawing; title?: string; fit?: boolean }) {
  const { width, height, shapes } = drawingShapes(drawing, 1200);
  const svg = (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={title ?? "Tegning av øvelsen"} style={{ display: "block", borderRadius: "var(--radius-md)" }}>
      <Shapes shapes={shapes} />
    </svg>
  );
  return fit ? (
    <div className="nm-drawing" style={fitStyle(width, height)}>
      {svg}
    </div>
  ) : (
    svg
  );
}
