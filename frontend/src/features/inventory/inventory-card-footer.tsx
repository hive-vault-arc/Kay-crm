import Link from "next/link";
import { Button } from "@/components/ui/button";

export function InventoryCardFooter({ href, name }: { href: string; name: string }) {
  return <Button action="forward" variant="ghost" asChild className="project-card-link mt-auto w-full flex-row-reverse rounded-none border-t bg-muted px-3 py-3 font-semibold text-link -outline-offset-2 hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground active:bg-primary-pressed [&_[data-action-icon]]:text-current">
    <Link href={href} aria-label={`Ouvrir la fiche ${name}`}>Ouvrir la fiche</Link>
  </Button>;
}
