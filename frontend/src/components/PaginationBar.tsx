import { MaterialIcon } from "./MaterialIcon";

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
};

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "registros",
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <footer className="mt-space-md flex flex-col items-center justify-between gap-space-sm border-t border-outline-variant/20 pt-space-md text-xs text-on-surface-variant sm:flex-row">
      <p className="tabular-nums">
        Exibindo{" "}
        <span className="font-semibold text-on-surface">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        de <span className="font-semibold text-on-surface">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-space-xs">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
          className="rounded bg-surface-container px-space-sm py-1 transition-colors hover:bg-surface-container-high disabled:opacity-40"
        >
          <MaterialIcon name="chevron_left" size={16} />
        </button>
        <span className="min-w-[4.5rem] text-center font-semibold text-on-surface">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
          className="rounded bg-surface-container px-space-sm py-1 transition-colors hover:bg-surface-container-high disabled:opacity-40"
        >
          <MaterialIcon name="chevron_right" size={16} />
        </button>
      </div>
    </footer>
  );
}