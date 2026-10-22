import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAY CRM", short_name: "KAY", lang: "fr",
    description: "L’espace de travail de l’équipe KAY.",
    start_url: "/notifications", scope: "/", display: "standalone",
    icons: [{ src: "/images/kay-apple-icon.png", sizes: "180x180", type: "image/png" }],
  };
}
