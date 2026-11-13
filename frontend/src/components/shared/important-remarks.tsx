import { useId, type ComponentProps } from "react";
import { AlertIcon } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const title = "Remarques importantes";
const surface = "rounded-md border border-danger/25 bg-danger-background p-3";

export function ImportantRemarksField({ className, id, ...props }: ComponentProps<"textarea">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return <div className={cn("grid min-w-0 gap-2", surface, className)}>
    <Label htmlFor={fieldId} className="flex items-center gap-2">
      <AlertIcon size={16} className="shrink-0 text-danger" aria-hidden="true" />
      {title} (facultatif)
    </Label>
    <Textarea {...props} id={fieldId} rows={3} maxLength={1000} placeholder="Points de vigilance pour l’équipe…" aria-describedby={[fieldId + "-help", props["aria-describedby"]].filter(Boolean).join(" ")} />
    <p id={fieldId + "-help"} className="text-xs text-foreground">Visible uniquement dans le CRM.</p>
  </div>;
}

export function ImportantRemarks({ value }: { value?: string | null }) {
  if (!value) return null;
  return <section aria-label={title} className={cn("grid min-w-0 gap-2", surface)}>
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      <AlertIcon size={16} className="shrink-0 text-danger" aria-hidden="true" />
      {title}
    </h2>
    <p className="whitespace-pre-wrap wrap-anywhere text-sm text-foreground">{value}</p>
  </section>;
}
