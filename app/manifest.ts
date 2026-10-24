import type { MetadataRoute } from "next";

/** Web app manifest: makes the home-screen app open standalone, without Safari's UI. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nymark – Gruppeorganisering",
    short_name: "Nymark",
    description: "Fordel spillere på lag og lag treningsopplegg for trenere i Nymark.",
    lang: "nb",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Same as --chrome and --surface in design/tokens.css (the manifest cannot read CSS variables).
    theme_color: "#121212",
    background_color: "#121212",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
