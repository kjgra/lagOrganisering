import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/toast";
import { appTitle } from "@/lib/env";
import "./globals.css";

const barlow = localFont({
  variable: "--font-barlow",
  display: "swap",
  src: [
    { path: "./fonts/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const barlowCondensed = localFont({
  variable: "--font-barlow-condensed",
  display: "swap",
  src: [
    { path: "./fonts/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: appTitle(),
  description: "Fordel spillere på lag og lag treningsopplegg for trenere i Nymark.",
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

const THEMES = ["light", "dark", "system"] as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const stored = (await cookies()).get("theme")?.value;
  const theme = THEMES.find((t) => t === stored) ?? "light";
  return (
    <html lang="nb" data-theme={theme} className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
