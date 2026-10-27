"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { blocksSchema, floorsSchema, unitTypesSchema, type Block, type Development, type Floor, type UnitType } from "./development-contracts";
import { HierarchyEditor, HierarchyEntry } from "./hierarchy-editor";
import type { HierarchyItem, HierarchyKind } from "./inventory-form-model";

type StructurePage = { items: (Block | UnitType)[]; page: number; page_size: number; total: number; has_previous: boolean; has_next: boolean };
type Editing = { kind: HierarchyKind; parent: string; parentLabel?: string; item?: HierarchyItem };

export function HierarchyPanel({ development, writable, saved, types = false }: { development: Development; writable: boolean; saved: () => void; types?: boolean }) {
  const [page, setPage] = useState(1), [block, setBlock] = useState<Block>(), [editing, setEditing] = useState<Editing>(), [revision, setRevision] = useState(0);
  const scope = useRef<HTMLDivElement>(null), guard = useUnsavedGuard();
  const kind = types ? "unit-types" : "blocks";
  const result = useQuery<StructurePage>(queryPath(`developments/${development.id}/${kind}`, { page, page_size: 25 }), types ? unitTypesSchema : blocksSchema);
  const allowed = writable && !development.archived_at;
  function committed() { setEditing(undefined); setRevision(value => value + 1); result.refresh(); saved(); }
  function leave() { guard.request(() => setEditing(undefined), scope.current ?? undefined); }
  const denied = result.error && [401, 403, 404].includes(result.error.status);
  return <>{guard.dialog}<div ref={scope} className="min-w-0">
    {denied ? <RecordError error={result.error!} retry={result.refresh} /> : editing ? <HierarchyEditor key={`${editing.kind}:${editing.item?.id ?? editing.parent}`} development={development} {...editing} saved={committed} cancel={leave} /> : <>
      <RecordSection title={types ? "Types réutilisables" : "Blocs et étages"} description={types ? "Un type prépare les caractéristiques de nouvelles unités. Chaque unité garde ses propres offres." : "Ouvrez un bloc pour consulter ses étages. Certaines unités peuvent être rattachées directement au programme."} action={allowed ? <Button action="create" type="button" onClick={() => setEditing({ kind, parent: development.id })}>{types ? "Créer un type" : "Créer un bloc"}</Button> : undefined}>
        {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement de la structure…</p> : <><div className="grid min-w-0 gap-3">{result.value.items.map(item => <HierarchyEntry key={item.id} item={item} actions={<>{!("category" in item) ? <Button action="inventory" type="button" variant={block?.id === item.id ? "default" : "outline"} aria-pressed={block?.id === item.id} onClick={() => setBlock(item)}>Étages de {item.code}</Button> : null}{allowed ? <Button action="edit" type="button" variant="quiet" aria-label={`Modifier ${item.code}`} onClick={() => setEditing({ kind, parent: development.id, item })}>Modifier</Button> : null}</>} />)}</div>{!result.value.items.length ? <p className="text-sm text-muted-foreground">{types ? "Aucun type réutilisable renseigné." : "Aucun bloc renseigné."}</p> : null}{result.value.total > 25 || page > 1 ? <NumberedPages label={types ? "Pages des types" : "Pages des blocs"} page={page} total={result.value.total} size={25} change={next => { setBlock(undefined); setPage(next); }} /> : null}</>}
      </RecordSection>
      {!types && block ? <Floors key={block.id} development={development} block={block} writable={allowed} revision={revision} edit={item => setEditing({ kind: "floors", parent: block.id, parentLabel: block.code, item })} close={() => setBlock(undefined)} /> : null}
    </>}
  </div></>;
}

function Floors({ development, block, writable, revision, edit, close }: { development: Development; block: Block; writable: boolean; revision: number; edit: (item?: Floor) => void; close: () => void }) {
  const [page, setPage] = useState(1);
  const result = useQuery(queryPath(`blocks/${block.id}/floors`, { page, page_size: 25 }), floorsSchema, revision);
  return <RecordSection title={`Étages · ${block.code}`} description={block.label} action={<>{writable ? <Button action="create" type="button" onClick={() => edit()}>Créer un étage</Button> : null}<Button action="close" type="button" variant="quiet" aria-label={`Fermer les étages de ${block.code}`} onClick={close}>Fermer</Button></>}>
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des étages…</p> : <><div className="grid min-w-0 gap-3">{result.value.items.map(item => <HierarchyEntry key={item.id} item={item} actions={<><Button action="inventory" type="button" variant="outline" asChild><a href={`/projects/${development.id}?tab=units&block_id=${block.id}&floor_id=${item.id}`}>Unités de {item.code}</a></Button>{writable ? <Button action="edit" type="button" variant="quiet" aria-label={`Modifier ${item.code}`} onClick={() => edit(item)}>Modifier</Button> : null}</>} />)}</div>{!result.value.items.length ? <p className="text-sm text-muted-foreground">Aucun étage dans ce bloc.</p> : null}{result.value.total > 25 || page > 1 ? <NumberedPages label="Pages des étages" page={page} total={result.value.total} size={25} change={setPage} /> : null}</>}
  </RecordSection>;
}
