import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirstPage = page === 0;
  const isLastPage = page >= totalPages - 1;

  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  const btn =
    'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]';

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-theme-sm text-gray-500 dark:text-gray-400">
        {total > 0 ? (
          <>
            Showing <span className="font-medium text-gray-700 dark:text-gray-200">{start}-{end}</span> of{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
          </>
        ) : (
          'No results'
        )}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirstPage}
          className={btn}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-theme-sm text-gray-700 dark:text-gray-300 px-2">
          Page <span className="font-medium">{page + 1}</span> / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLastPage}
          className={btn}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
