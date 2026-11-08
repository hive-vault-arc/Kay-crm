import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import Script from "next/script";
import { classicHistoryScript } from "@/lib/classic-history-bootstrap";
import { ThemeProvider } from "@/features/shell/theme-provider";
import { parseThemePreference } from "@/lib/theme-preference";
import appleIcon from "../../public/images/kay-apple-icon.png";
import { themeVariables } from "@/lib/theme";
import "./globals.css";

const manrope = localFont({ src: "../fonts/manrope-variable.ttf", variable: "--font-manrope", weight: "200 800", display: "swap", preload: false });
const inter = localFont({ src: "../fonts/InterVariable.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });
const fraunces = localFont({ src: "../fonts/Fraunces-variable.woff2", variable: "--font-fraunces", weight: "100 900", display: "swap", preload: false });
const dmSans = localFont({ src: "../fonts/DMSans-variable.woff2", variable: "--font-dm-sans", weight: "100 1000", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "KAY | Espace de travail", template: "%s | KAY" },
  description: "L’espace de travail immobilier de l’équipe KAY. Aperçu local.",
  robots: { index: false, follow: false },
  icons: {
    icon: { url: "/favicon.svg?v=kay-gold-20261016", type: "image/svg+xml" },
    shortcut: "/favicon.svg?v=kay-gold-20261016",
    apple: { url: appleIcon.src, sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const saved = (await cookies()).get("kay-ui-theme")?.value;
  const preference = parseThemePreference(saved);
  return (
    <html lang="fr" data-theme={preference} style={themeVariables} className={`${inter.variable} ${manrope.variable} ${fraunces.variable} ${dmSans.variable}${preference === "dark" ? " dark" : ""}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Script id="kay-classic-history" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: classicHistoryScript }} />
        <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
