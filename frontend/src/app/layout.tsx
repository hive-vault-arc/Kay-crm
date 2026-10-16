import type { Metadata } from "next";
import { themeVariables } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KAY | Espace de travail", template: "%s | KAY" },
  description: "L’espace de travail immobilier de l’équipe KAY. Aperçu local.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" style={themeVariables}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
