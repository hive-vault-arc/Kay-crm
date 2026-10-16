import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="page-gutter mx-auto grid min-h-dvh max-w-reading content-center justify-items-start gap-4 py-8">
      <h1 className="text-page font-bold">Page introuvable</h1>
      <p className="text-muted-foreground">
        Cette page n’existe pas ou n’est pas encore disponible.
      </p>
      <Button action="back" asChild>
        <Link href="/login">Revenir à l’entrée</Link>
      </Button>
    </main>
  );
}
