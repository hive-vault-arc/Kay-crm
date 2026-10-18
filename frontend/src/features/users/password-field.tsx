"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordField(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return <div className="flex min-w-0 items-center gap-2" onBlurCapture={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setVisible(false);
  }}>
    <Input {...props} type={visible ? "text" : "password"} data-private-credential spellCheck={false} autoCapitalize="none" maxLength={1024} />
    <Button type="button" action={visible ? "hide" : "show"} variant="outline" size="icon" disabled={props.disabled}
      aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={visible}
      onClick={() => setVisible(value => !value)} />
  </div>;
}
