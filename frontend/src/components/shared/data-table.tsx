"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function DataTable<T>({
  columns,
  rows,
  caption,
  emptyLabel,
  className,
  scrollLabel,
  getRowId,
  rowSelectionLabel,
  selectionAction,
  footerCaption = false,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  caption: string;
  emptyLabel: string;
  className?: string;
  scrollLabel?: string;
  getRowId?: (row: T) => string;
  rowSelectionLabel?: (row: T) => string;
  selectionAction?: (rows: T[], clear: () => void) => ReactNode;
  footerCaption?: boolean;
}) {
  "use no memo";
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [onlySelected, setOnlySelected] = useState(false);
  // TanStack v8 exposes mutable table functions; keep this boundary outside React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    enableRowSelection: Boolean(rowSelectionLabel),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });
  const selected = table.getSelectedRowModel().rows;
  const displayedRows = onlySelected && selected.length ? selected : table.getRowModel().rows;
  return (
    <div className="grid min-w-0 gap-2">
    {rowSelectionLabel && selected.length ? <div className="crm-selection-toolbar"><p>{selected.length} sélectionné(s) sur cette page</p>{selectionAction?.(selected.map(row => row.original), () => { table.resetRowSelection(); setOnlySelected(false); })}<Button action="filter" variant="quiet" size="compact" onClick={() => setOnlySelected(value => !value)}>{onlySelected ? "Afficher toute la page" : "Afficher la sélection"}</Button><Button action="reset" variant="quiet" size="compact" onClick={() => { table.resetRowSelection(); setOnlySelected(false); }}>Effacer la sélection</Button></div> : null}
    <Table className={className} scrollLabel={scrollLabel}>
      <TableCaption className={footerCaption ? "sr-only" : undefined}>{caption}</TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {rowSelectionLabel ? <TableHead className="crm-selection-cell"><label className="crm-selection-target"><Checkbox aria-label="Sélectionner toutes les lignes de cette page" checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false} onCheckedChange={checked => table.toggleAllRowsSelected(Boolean(checked))} /></label></TableHead> : null}
            {group.headers.map((header) => (
              <TableHead key={header.id} style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {displayedRows.length ? (
          displayedRows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
              {rowSelectionLabel ? <TableCell className="crm-selection-cell"><label className="crm-selection-target"><Checkbox aria-label={`Sélectionner ${rowSelectionLabel(row.original)}`} checked={row.getIsSelected()} onCheckedChange={checked => row.toggleSelected(Boolean(checked))} /></label></TableCell> : null}
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length + (rowSelectionLabel ? 1 : 0)}>{emptyLabel}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    {footerCaption ? <p className="crm-table-caption" aria-hidden="true">{caption}</p> : null}
    </div>
  );
}
