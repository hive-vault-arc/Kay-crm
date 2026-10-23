"use client";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { developmentSchema, type Development } from "./development-contracts";
import { DevelopmentEditor } from "./development-editor";
import { HierarchyPanel } from "./hierarchy-panel";
import { UnitDirectory } from "./unit-directory";
import { OwnerEditor } from "./owner-editor";
import { Campaign } from "./campaign";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { categoryLabels, stateLabels } from "./contracts";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { FilePanel } from "@/features/files/file-panel";
import { ClockIcon, ColumnsIcon, ContactsIcon, DashboardIcon, DealIcon, DevelopmentIcon, EnquiryIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { InventoryFact, InventoryTab } from "./record-details";

export function DevelopmentRecord({ id, role, edit = false, initialTab = "facts", blockId, floorId, unitTypeId }: { id: string; role: StaffRole; edit?: boolean; initialTab?: string; blockId?: string; floorId?: string; unitTypeId?: string }) {
  const result = useQuery(`/api/v1/developments/${id}`, developmentSchema);
  const [tab, setTab] = useState(["units", "briefing", "hierarchy", "types", "owners", "offerings", "history"].includes(initialTab) ? initialTab : "facts");
  const [editingOwners, setEditingOwners] = useState(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const writable = role !== "agent" && !result.value?.archived_at;
  if (edit && result.value?.archived_at) return <p role="alert">Dossier archivé : restaurez-le avant de le modifier.</p>;
  const heading = !edit ? <PageHeader title="Programme immobilier" description="Programme entier, structure et unités physiques distincts." route={`/projects/${id}`} /> : null;
  if (result.error) return <>{heading}<RecordError error={result.error} retry={result.refresh} /></>;
  if (!result.value) return <>{heading}<p role="status">Chargement du programme…</p></>;
  const development = result.value; const target = { ...development, inventoryLevel: "development" as const };
  if (edit) return <DevelopmentEditor development={development} />;
  function saved() { setEditingOwners(false); setNotice("Inventaire enregistré."); setTab("facts"); result.refresh(); }
  return <div className="grid min-w-0 gap-4">
    <nav aria-label="Fil d’Ariane du programme"><ol className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground"><li><Link href="/projects" className="inline-flex min-h-control items-center text-link underline">Projets</Link></li><li className="wrap-anywhere" aria-current="page">/ {development.reference}</li></ol></nav>
    <header className="surface flex min-w-0 flex-wrap items-center gap-4"><InventoryThumbnail kind="development" id={id} compact />
      <div className="grid min-w-0 flex-1 basis-64 gap-1"><p className="text-xs font-medium text-muted-foreground">Programme immobilier</p><h1 data-route={`/projects/${id}`} tabIndex={-1} className="wrap-anywhere text-page font-semibold">{development.reference}</h1><p className="wrap-anywhere font-medium">{development.name}</p><p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground wrap-anywhere"><LocationIcon aria-hidden="true" className="size-4 shrink-0" />{development.location ?? "Localisation non renseignée"}</p></div>
      <dl data-summary className="order-2 grid w-full min-w-0 shrink-0 grid-cols-2 gap-x-5 gap-y-3 border-t pt-4 sm:grid-cols-4"><div><dt className="text-xs text-muted-foreground">Unités physiques</dt><dd className="text-lg font-semibold tabular-nums">{development.unit_count}</dd></div><div><dt className="text-xs text-muted-foreground">Unités disponibles</dt><dd className="text-lg font-semibold text-success tabular-nums">{development.available_unit_count}</dd></div>{(["sale", "rental"] as const).map(kind => <div key={kind}><dt className="text-xs text-muted-foreground">{kind === "sale" ? "Vente du programme entier" : "Location du programme entier"}</dt><dd className="text-sm font-medium">{development.offerings.find(offer => offer.kind === kind) ? stateLabels[development.offerings.find(offer => offer.kind === kind)!.state] : "Aucune campagne actuelle"}</dd></div>)}</dl>
      <div className="order-1 flex flex-wrap gap-2">{!development.archived_at ? <Button action="edit" variant="outline" asChild><Link href={`/projects/${id}/edit`}>Modifier le programme</Link></Button> : null}{role !== "agent" ? <Button action={development.archived_at ? "restore" : "archive"} variant="outline" asChild><a href="#inventory-lifecycle">{development.archived_at ? "Restaurer le projet" : "Archiver le projet"}</a></Button> : null}</div>
    </header>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}{busy ? <p role="status">Enregistrement en cours, veuillez patienter…</p> : null}
    <InventoryBusyContext.Provider value={pending => { setBusy(pending); if (pending) setNotice(""); }}><fieldset disabled={busy} className="grid min-w-0 gap-6" aria-busy={busy}><legend className="sr-only">Fiche du programme et commandes d’inventaire</legend><Tabs value={tab} onValueChange={setTab}><TabsList aria-label="Fiche du programme"><InventoryTab value="facts" icon={DashboardIcon}>Aperçu</InventoryTab><InventoryTab value="units" icon={PropertyIcon}>Unités</InventoryTab><InventoryTab value="hierarchy" icon={DevelopmentIcon}>Blocs et étages</InventoryTab><InventoryTab value="types" icon={ColumnsIcon}>Types réutilisables</InventoryTab><InventoryTab value="briefing" icon={EnquiryIcon}>Présentation</InventoryTab><InventoryTab value="owners" icon={ContactsIcon}>Propriétaires</InventoryTab><InventoryTab value="offerings" icon={DealIcon}>Offres du programme</InventoryTab><InventoryTab value="history" icon={ClockIcon}>Historique</InventoryTab></TabsList>
      <TabsContent value="facts" className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,1fr)]"><section className="surface grid min-w-0 content-start gap-5"><SectionHeading icon={DevelopmentIcon}>Informations du programme</SectionHeading><dl className="grid min-w-0 gap-4 sm:grid-cols-2"><InventoryFact icon={DevelopmentIcon} label="Catégorie du programme" tone="info">{development.category === "mixed" ? "Mixte" : categoryLabels[development.category]}</InventoryFact><InventoryFact icon={PropertyIcon} label="Unités physiques (hors modèles)" tone="info">{development.available_unit_count} disponibles / {development.unit_count} unités</InventoryFact><InventoryFact icon={LocationIcon} label="Localisation" wide tone="info">{development.location ?? "Non renseignée"}</InventoryFact></dl><SafeLink link={development.developer} label="Promoteur" /><Button action="inventory" className="justify-self-start" variant="outline" onClick={() => setTab("units")}>Voir les unités disponibles</Button>{development.archived_at ? <p>Lecture seule : restaurez ce dossier pour le modifier.</p> : null}</section><div className="surface min-w-0 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">{!development.archived_at ? <FilePanel parentKind="development" parentId={id} writable={writable} /> : <p>Documents indisponibles tant que le dossier est archivé.</p>}</div></TabsContent>
      <TabsContent value="units"><UnitDirectory id={id} writable={!development.archived_at} blockId={blockId} floorId={floorId} unitTypeId={unitTypeId} /></TabsContent>
      <TabsContent value="hierarchy"><HierarchyPanel development={development} writable={!development.archived_at} saved={saved} /></TabsContent>
      <TabsContent value="types"><HierarchyPanel development={development} writable={!development.archived_at} saved={saved} types /></TabsContent>
      <TabsContent value="briefing" className="surface grid min-w-0 gap-4"><h2 className="text-section font-medium">Présentation partagée</h2><p className="whitespace-pre-wrap wrap-anywhere">{development.briefing_text ?? "Aucune présentation renseignée."}</p><p className="text-sm text-muted-foreground">Informations non secrètes lisibles par l’équipe. Une présentation vide n’empêche pas la disponibilité.</p>{!development.archived_at ? <Button action="edit" asChild className="justify-self-start"><Link href={`/projects/${id}/edit`}>Modifier la présentation</Link></Button> : null}</TabsContent>
      <TabsContent value="owners" className="surface grid min-w-0 gap-6">{editingOwners && writable ? <OwnerEditor property={target} saved={saved} cancel={() => setEditingOwners(false)} /> : <><h2 className="text-section font-medium">Propriétaires légaux du programme entier</h2>{development.owners.length ? development.owners.map((link, index) => <SafeLink key={index} link={link} label={`Propriétaire ${index + 1}`} />) : <p>Propriétaires non renseignés. Un promoteur ne constitue pas une preuve de propriété.</p>}{writable ? <Button action="edit" className="justify-self-start" onClick={() => setEditingOwners(true)}>Modifier les propriétaires</Button> : null}</>}</TabsContent>
      <TabsContent value="offerings" className="record-stack grid min-w-0 items-start gap-4 xl:grid-cols-2"><div className="grid gap-1 xl:col-span-2"><h2 className="text-section font-medium">Offres du programme entier</h2><p className="text-sm text-muted-foreground">Ces campagnes ne fixent ni le prix ni la disponibilité des unités physiques.</p></div>{(["sale", "rental"] as const).map(kind => <Campaign key={kind} property={target} kind={kind} writable={writable} saved={saved} />)}</TabsContent>
      <TabsContent value="history"><InventoryHistory id={id} level="development" /></TabsContent>
    </Tabs>{role !== "agent" ? <div id="inventory-lifecycle" className="surface min-w-0 scroll-mt-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0"><LifecyclePanel kind="developments" id={id} version={development.version} reference={development.reference} archived={!!development.archived_at} saved={result.refresh} /></div> : null}</fieldset></InventoryBusyContext.Provider><Button action="back" asChild variant="outline" className="justify-self-start"><Link href="/projects">Tous les projets</Link></Button></div>;
}
function SafeLink({ link, label }: { link: Development["developer"]; label: string }) {
  return <section className="grid min-w-0 gap-2 border-b pb-4"><h3 className="font-medium">{label}</h3><p className="wrap-anywhere">{link.marketing_display ?? "Libellé commercial non renseigné"}</p>{link.contact ? <Link href={`/contacts/${link.contact.id}`} className="inline-flex min-h-control items-center justify-self-start text-link underline wrap-anywhere">{link.contact.name}</Link> : <p className="text-sm text-muted-foreground">Identité privée protégée par les droits Contacts.</p>}</section>;
}
