/** Logo, word mark «Nymark» and «GRUPPEORGANISERING», always together, on the dark frame. */
export function Brand({ size = "md", env }: { size?: "md" | "lg"; env?: string }) {
  return (
    <span className={size === "lg" ? "nm-brand nm-brand--lg" : "nm-brand"}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
      <img src="/logo.svg" alt="" width={size === "lg" ? 56 : 40} height={size === "lg" ? 56 : 40} />
      <span>
        <span className="nm-brand__name" style={{ display: "block" }}>
          Nymark
        </span>
        <span className="nm-brand__sub" style={{ display: "block" }}>
          Gruppeorganisering
        </span>
      </span>
      {env ? <span className="nm-env">{env}</span> : null}
    </span>
  );
}
