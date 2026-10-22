import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";
import { actionIconColors, buttonActions, type ActionDefinition, type ButtonAction } from "./button-actions";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-normal transition-colors outline-none focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        creation:
          "bg-creation font-semibold text-creation-foreground hover:bg-creation-hover active:bg-creation-pressed",
        success:
          "bg-success text-white hover:bg-success/95 active:bg-success/90",
        quiet:
          "font-normal text-muted-foreground hover:bg-muted hover:text-foreground active:bg-accent",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-control px-4 py-2 has-[>svg]:px-3",
        xs: "min-h-control gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-control gap-1.5 px-3",
        compact: "min-h-control gap-1.5 px-2",
        lg: "min-h-field px-6",
        icon: "size-control",
        "icon-xs": "size-control [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-control",
        "icon-lg": "size-field",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size = "default",
  asChild = false,
  action,
  liveRefresh = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    action?: ButtonAction;
    liveRefresh?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const definition: ActionDefinition | undefined = action ? buttonActions[action] : undefined;
  const Icon = definition?.icon;
  const resolvedVariant = action === "create" ? "creation"
    : !variant || variant === "default" ? definition?.variant ?? "default" : variant;
  const filled = ["default", "creation", "success", "destructive"].includes(resolvedVariant);
  const content = Icon && definition ? [
    <Icon key="icon" aria-hidden="true" data-action-icon className={cn("size-4", !filled && actionIconColors[definition.tone], definition.iconClassName)} />,
    asChild ? <Slot.Slottable key="label">{children}</Slot.Slottable> : <span key="label" className="min-w-0">{children}</span>,
  ] : children;

  return (
    <Comp
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={size}
      data-action={action}
      data-live-refresh={liveRefresh || undefined}
      data-action-tone={definition?.tone}
      className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
      {...props}
    >{content}</Comp>
  );
}

export { Button, buttonVariants };
