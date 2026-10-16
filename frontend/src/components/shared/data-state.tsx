import { AlertIcon, EmptyFolderIcon } from "@/components/icons";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type DataStateProps = {
  state: "empty" | "error" | "loading";
  title: string;
  description?: string;
  action?: ReactNode;
};

export function DataState({
  state,
  title,
  description,
  action,
}: DataStateProps) {
  if (state === "loading")
    return (
      <section role="status" aria-busy="true" className="grid gap-4 py-8">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Skeleton className="h-row w-full" />
        <Skeleton className="h-row w-full" />
        <Skeleton className="h-row w-full" />
      </section>
    );
  if (state === "error")
    return (
      <Alert
        variant="destructive"
        className="grid gap-4 bg-danger-background p-6 text-danger"
      >
        <AlertIcon aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="grid gap-4 text-danger">
          <p>{description}</p>
          {action}
        </AlertDescription>
      </Alert>
    );
  return (
    <section className="grid justify-items-start gap-4 rounded-md border border-dashed bg-card p-6 md:p-8">
      <EmptyFolderIcon aria-hidden="true" className="size-8 text-muted-foreground" />
      <div className="grid gap-2">
        <h2 className="text-section font-semibold">{title}</h2>
        <p className="max-w-reading text-base text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </section>
  );
}
