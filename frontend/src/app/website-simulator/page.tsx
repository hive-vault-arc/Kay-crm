import type { Metadata } from "next";
import { WebsiteForm } from "@/features/intake/website-form";
export const metadata: Metadata = { title: "Formulaire web local" };
export default function WebsiteSimulatorPage() { return <WebsiteForm />; }
