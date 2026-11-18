'use client'

import Link from 'next/link'
import { ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import type { Entrepreneurship } from '../lib/expediente'
import { Button } from './ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const dateFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const columns: ColumnDef<Entrepreneurship>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold text-foreground hover:bg-muted hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Emprendimiento <ArrowUpDown aria-hidden="true" className="size-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link className="font-semibold text-foreground underline-offset-4 hover:text-foreground hover:underline" href={`/expediente/${row.original.id}`}>
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold text-foreground hover:bg-muted hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Fecha de creación <ArrowUpDown aria-hidden="true" className="size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(row.original.created_at))}</span>,
  },
]

export function EntrepreneurshipTable({ items }: { items: Entrepreneurship[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Table className="border-y border-border bg-white">
      <TableCaption className="sr-only">Emprendimientos disponibles en tu alcance</TableCaption>
      <TableHeader className="bg-white">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
