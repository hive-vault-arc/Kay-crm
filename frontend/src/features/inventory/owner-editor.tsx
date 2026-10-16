"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { useHydrated } from "@/hooks/use-hydrated";
import { ownersSchema, type InventoryTarget } from "./contracts";
import { InventoryError } from "./states";
import { useInventoryCommand } from "./use-command";

export function OwnerEditor({ property, saved, cancel }: { property: InventoryTarget; saved: () => void; cancel: () => void }) {
  const [links, setLinks] = useState(property.owners.flatMap(owner => owner.contact ? [{ id: owner.contact.id, name: owner.contact.name, display: owner.marketing_display ?? "" }] : []));
  const [version, setVersion] = useState(property.version);
  const [notice, setNotice] = useState("");
  const command = useInventoryCommand();
  const hydrated = useHydrated();
  function save() {
    const body = ownersSchema.safeParse({ expected_version: version, owners: links.map(link => ({ contact_id: link.id, marketing_display: link.display.trim() || null })) });
    if (!body.success) { setNotice("Vérifiez les propriétaires et leurs libellés (160 caractères maximum)."); return; }
    void command.submit(`/api/v1/${property.inventoryLevel === "development" ? "developments" : "properties"}/${property.id}/owners`, body.data, "PUT", saved);
  }
  return <div className="grid min-w-0 max-w-reading gap-6"><p>Plusieurs propriétaires légaux sont possibles. Un développeur seul ne remplace pas un propriétaire légal. Laissez la liste vide si elle est inconnue au stade brouillon.</p>
    <fieldset disabled={!hydrated || command.pending} className="grid min-w-0 gap-6"><legend className="sr-only">Propriétaires légaux du bien</legend>
      <ul className="grid min-w-0 gap-4">{links.map((link, index) => <li key={link.id} className="grid min-w-0 gap-2 border-b pb-4"><p className="wrap-anywhere font-medium">{link.name}</p><Label htmlFor={`owner-display-${index}`}>Libellé commercial partagé {index + 1} (facultatif)</Label><Input id={`owner-display-${index}`} maxLength={160} value={link.display} onChange={event => setLinks(links.map(item => item.id === link.id ? { ...item, display: event.target.value } : item))} /><Button className="h-auto min-h-control justify-self-start whitespace-normal text-left wrap-anywhere" variant="outline" onClick={() => setLinks(links.filter(item => item.id !== link.id))}>Retirer {link.name} de la liste</Button></li>)}</ul>
      {links.length < 100 ? <ContactSelector choose={contact => { if (links.some(link => link.id === contact.id)) setNotice("Ce contact figure déjà dans la liste."); else { setLinks([...links, { id: contact.id, name: contact.name, display: "" }]); setNotice(""); } }} /> : <p>La limite technique de 100 propriétaires est atteinte.</p>}
    </fieldset>
    <p className="text-sm text-muted-foreground">Seuls les libellés commerciaux explicitement saisis sont partagés. Les identités privées restent soumises aux droits Contacts. Ne saisissez pas de téléphone ou de coordonnées privées dans un libellé.</p>
    {notice ? <p role="status">{notice}</p> : null}
    <InventoryError error={command.error} level={property.inventoryLevel} id={property.id} choose={current => { setVersion(current.version); command.clear(); }} />
    <div className="flex flex-wrap gap-2"><Button disabled={!hydrated || command.pending} onClick={save}>{command.pending ? "Enregistrement…" : "Enregistrer les propriétaires"}</Button><Button disabled={command.pending} variant="outline" onClick={cancel}>Annuler les propriétaires</Button></div>
  </div>;
}
