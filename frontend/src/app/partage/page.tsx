import type { Metadata } from "next";
import { ClientListing } from "@/features/shares/client-listing";

export const metadata: Metadata = {
  title: "Fiche immobilière",
  description: "Une fiche immobilière partagée par KAY Real Estate.",
  robots: { index: false, follow: false, noimageindex: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default function PublicListingPage() {
  let origin: string | undefined;
  try {
    const configured = new URL(process.env.API_BASE_URL ?? "");
    if (configured.protocol === "https:" && !configured.username && !configured.password &&
        configured.pathname === "/" && !configured.search && !configured.hash) origin = configured.origin;
  } catch { /* No deployment configuration: the public page fails closed. */ }
  return <ClientListing origin={origin} />;
}
