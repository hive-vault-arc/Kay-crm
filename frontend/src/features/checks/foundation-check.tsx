"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/shared/data-table";
import { DataState } from "@/components/shared/data-state";
import { useHydrated } from "@/hooks/use-hydrated";

const schema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Saisissez un libellé.")
    .max(80, "Le libellé est trop long."),
});
type Values = z.infer<typeof schema>;

export function FoundationCheck() {
  const hydrated = useHydrated();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { label: "" },
  });
  const [validated, setValidated] = useState(false);
  const [crashed, setCrashed] = useState(false);
  if (crashed) throw new Error("SP01_SYNTHETIC_ERROR");
  return (
    <div className="grid max-w-reading gap-8">
      <h1 className="text-page font-bold">Vérification des composants</h1>
      <p>
        Fixture technique synthétique, disponible uniquement sur le serveur de
        test.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(() => setValidated(true))}
          className="grid gap-4"
        >
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé de colonne</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Métadonnée d’affichage synthétique, sans enregistrement
                  métier.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!hydrated}>
            Vérifier le libellé
          </Button>
          {validated && <p role="status">Préférence validée localement.</p>}
        </form>
      </Form>
      <DataTable<Values>
        columns={[{ accessorKey: "label", header: "Libellé" }]}
        rows={[]}
        caption="Table de vérification vide"
        emptyLabel="Aucune ligne synthétique."
      />
      <DataState state="loading" title="Chargement des lignes…" />
      <DataState
        state="error"
        title="Lecture des lignes indisponible"
        description="Une erreur de lecture ne confirme aucun enregistrement."
      />
      <Button variant="outline" onClick={() => setCrashed(true)}>
        Déclencher l’erreur de test
      </Button>
    </div>
  );
}
