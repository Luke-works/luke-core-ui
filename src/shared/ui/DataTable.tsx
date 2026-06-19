import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Skeleton from './Skeleton';
import Pagination from './Pagination';

export { type ColumnDef } from '@tanstack/react-table';

/* ── Props ──────────────────────────────────────────────────── */

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  pageIndex?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  /** Suppress the outer rounded-2xl card shell (useful when nesting inside Card). */
  bare?: boolean;
}

const ICON_SIZE = 14;

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp size={ICON_SIZE} />;
  if (direction === 'desc') return <ArrowDown size={ICON_SIZE} />;
  return <ArrowUpDown size={ICON_SIZE} className="text-gray-400" />;
}

/** Map a TanStack sort state to the WCAG aria-sort token (#35). */
function ariaSort(direction: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
}

/**
 * DataTable — TanStack Table powered with TailAdmin's table look:
 *  rounded-2xl shell, gray-50 header row, divide-y body, hover gray-50/700.
 */
export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  onRowClick,
  pageSize = 20,
  pageIndex = 0,
  total,
  onPageChange,
  emptyMessage = 'No data available.',
  bare = false,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const shell = bare
    ? ''
    : 'overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]';

  /* ── Loading skeleton ───────────────────────────────────── */

  if (isLoading) {
    return (
      <div className={shell}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
              <tr>
                {columns.map((_, i) => (
                  <th key={i} className="px-5 py-3 text-left">
                    <Skeleton height="0.75rem" width="60%" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-5 py-4">
                      <Skeleton height="1rem" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────── */

  if (data.length === 0) {
    return (
      <div className={shell}>
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  /* ── Table ──────────────────────────────────────────────── */

  return (
    <div className={shell}>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      // aria-sort lets AT announce asc/desc/none (#35).
                      aria-sort={canSort ? ariaSort(header.column.getIsSorted()) : undefined}
                      className="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        // Real <button> → focusable + Enter/Space activation for free.
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-gray-700 dark:hover:text-white/80"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                // Keyboard-operable when the row is clickable (#35).
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total != null && onPageChange && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <Pagination
            page={pageIndex}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
