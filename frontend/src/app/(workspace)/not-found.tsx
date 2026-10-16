import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function WorkspaceNotFound() {
  return (
    <section className="grid justify-items-start gap-4">
      <h1 className="text-page font-bold">Page introuvable</h1>
      <p className="text-muted-foreground">
        Cette page n’existe pas ou n’est pas encore disponible.
      </p>
      <Button action="back" asChild>
        <Link href="/login">Revenir à l’entrée</Link>
      </Button>
    </section>
  );
}
