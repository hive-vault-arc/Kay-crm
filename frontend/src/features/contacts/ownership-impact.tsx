import type { ChangeIntent, Preview } from "./ownership-contracts";

export function OwnershipImpact({ preview, intent }: { preview: Preview; intent: ChangeIntent }) {
  const impact = preview.impact;
  const names = (values: { display_name: string }[]) => values.map(value => value.display_name).join(", ") || "Aucun";
  return <div className="grid min-w-0 gap-4" aria-label="Impact vérifié">
    {impact.contacts.map((contact, index) => <section key={contact.id} className="grid min-w-0 gap-2 border-b pb-4"><h3 className="wrap-anywhere font-medium">{intent.operation === "merge" ? index === 0 ? "Source fusionnée" : "Fiche conservée" : "Contact concerné"} : {contact.name}</h3><p className="wrap-anywhere text-sm">Responsable : {contact.primary_agent.display_name} · Version {contact.version}</p><p className="wrap-anywhere">{contact.phones.map(value => value.number).join(", ")}</p><p>{contact.phones.length} téléphone(s), {contact.emails.length} e-mail(s).</p></section>)}
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Responsable après l’opération</dt><dd className="wrap-anywhere font-medium">{impact.primary_agent_after.display_name}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Demandes liées conservées</dt><dd>{impact.enquiries}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Documents privés conservés</dt><dd>{impact.document_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Recherches indépendantes conservées</dt><dd>{impact.requirement_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Affaires indépendantes conservées</dt><dd>{impact.deal_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Visites conservées</dt><dd>{impact.visit_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Tâches conservées</dt><dd>{impact.task_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Liens de propriété légale conservés</dt><dd>{impact.property_owner_links}</dd></div><div><dt className="text-sm text-muted-foreground">Propriétaires de programme / promoteurs</dt><dd>{impact.development_owner_links} / {impact.developer_links}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Demandes renvoyées à la file du responsable</dt><dd>{impact.unassigned_enquiries}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Accès retirés sur la source</dt><dd className="wrap-anywhere">{names(impact.access_lost)}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Accès accordés</dt><dd className="wrap-anywhere">{names(impact.access_gained)}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Collaborateurs conservés</dt><dd className="wrap-anywhere">{names(impact.retained_collaborators)}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Identité après opération</dt><dd>{impact.phones_after} téléphone(s), {impact.emails_after} e-mail(s)</dd></div>
    </dl>
    {intent.operation === "merge" ? <p>La fiche conservée garde son nom, sa source, son responsable et ses collaborateurs. Les coordonnées et rôles sont réunis ; les demandes gardent leurs liens et leur provenance. Les collaborateurs de la source ne sont pas ajoutés. La source reste identifiable dans l’historique. Restaurer n’annule pas une fusion.</p> : null}
    <p className="text-sm text-muted-foreground">Les auteurs et les dates passés ne changent pas. Documents, recherches et affaires suivent les droits de la fiche conservée, sans réunir les recherches ni les affaires entre elles. Les visites sont conservées avec leur origine et leurs participants, sous les droits actuels du contact. Les tâches conservent leur responsable et leur historique, sans maintenir un accès retiré.</p>
    <p className="whitespace-pre-wrap wrap-anywhere">Motif : {intent.reason}</p>
  </div>;
}
