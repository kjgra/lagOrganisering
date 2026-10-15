import { drawingShapes, type Drawing } from "@/lib/plans/drawing";

/** A drawing as inline SVG (scales to its container). */
export function DrawingSvg({ drawing, title }: { drawing: Drawing; title?: string }) {
  const { width, height, shapes } = drawingShapes(drawing, 1200);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={title ?? "Tegning av øvelsen"} style={{ display: "block", borderRadius: "var(--radius-md)" }}>
      {shapes.map((s, i) => {
        switch (s.k) {
          case "rect":
            return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} opacity={s.opacity} />;
          case "circle":
            return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} />;
          case "poly": {
            const pts = s.points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
            const common = { fill: s.fill ?? "none", stroke: s.stroke, strokeWidth: s.sw, strokeDasharray: s.dash?.join(" "), strokeLinejoin: "round" as const };
            return s.closed ? <polygon key={i} points={pts} {...common} /> : <polyline key={i} points={pts} {...common} />;
          }
          case "text":
            return (
              <text key={i} x={s.x} y={s.y + s.size * 0.35} fontSize={s.size} fill={s.fill} fontWeight={s.bold ? 700 : 400} textAnchor={s.anchor ?? "middle"} fontFamily="Barlow, system-ui, sans-serif">
                {s.text}
              </text>
            );
        }
      })}
    </svg>
  );
}
