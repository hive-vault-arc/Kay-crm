export function RecordStatusStrip({ items, current, label }: {
  items: { id: string; label: string }[];
  current: string;
  label: string;
}) {
  return <ol aria-label={label} className="flex min-w-0 flex-wrap border-b bg-card">{items.map(item => <li key={item.id} aria-current={item.id === current ? "step" : undefined} className={`flex min-h-11 items-center border-b-2 px-4 py-2 text-xs ${item.id === current ? "border-ring font-semibold text-foreground" : "border-transparent text-muted-foreground"}`}>{item.label}{item.id === current ? <span className="sr-only"> : statut actuel</span> : null}</li>)}</ol>;
}
