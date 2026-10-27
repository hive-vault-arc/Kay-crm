import type { Metadata } from "next";
import { WebsiteForm } from "@/features/intake/website-form";
export const metadata: Metadata = { title: "Demande web" };
export default function WebsiteSimulatorPage() { return <WebsiteForm />; }
