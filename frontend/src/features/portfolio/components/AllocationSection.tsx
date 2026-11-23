import type { AllocationSlice, RebalanceRow } from "../../../types/portfolio";
import { MaterialIcon } from "../../../components/MaterialIcon";

type AllocationSectionProps = {
  allocation: AllocationSlice[];
  meta: {
    volatility12m: string;
    sharpe: string;
    benchmarkCdi12m: string;
  };
  rebalance: RebalanceRow[];
  suggestedContribution: string;
};

export function AllocationSection({
  allocation,
  meta,
  rebalance,
  suggestedContribution,
}: AllocationSectionProps) {
  return (
    <section className="mb-space-lg grid grid-cols-1 gap-space-md lg:grid-cols-12">
      <div className="flex flex-col justify-between rounded-lg bg-surface-container-low p-space-md shadow-sm lg:col-span-8">
        <div>
          <SectionHeader
            title="Alocação de Ativos Consolidada"
            subtitle="Distribuição percentual por classe de ativos e patrimônio alocado"
            icon="verified"
            iconHint="Auditoria B3 D-0"
          />
          <div className="my-space-md flex h-7 w-full select-none overflow-hidden rounded bg-surface-container-highest">
            {allocation.map((slice) => (
              <div
                key={slice.id}
                title={`${slice.label} (${slice.percent}%)`}
                className={`h-full cursor-pointer transition-all ${slice.colorClass}`}
                style={{ width: `${slice.percent}%` }}
              />
            ))}
          </div>
          <div className="mt-space-md grid grid-cols-1 gap-space-sm sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {allocation.map((slice) => (
              <div key={slice.id} className="rounded bg-surface-container p-space-xs">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${slice.colorClass}`} />
                  <span className="truncate text-[11px] text-on-surface">{slice.label}</span>
                </div>
                <p className="text-sm font-semibold tabular-nums text-on-surface">
                  {slice.percent.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </p>
                <p className="text-xs tabular-nums text-on-surface-variant">{slice.amount}</p>
              </div>
            ))}
          </div>
        </div>
        <AllocationFooter
          volatility={meta.volatility12m}
          sharpe={meta.sharpe}
          benchmark={meta.benchmarkCdi12m}
        />
      </div>

      <div className="flex flex-col justify-between rounded-lg bg-surface-container-low p-space-md shadow-sm lg:col-span-4">
        <div>
          <SectionHeader
            title="Meta de Rebalanceamento"
            subtitle="Desvio em relação à política do casal"
            icon="balance"
          />
          <div className="mt-space-sm flex flex-col gap-space-xs text-xs">
            <p className="flex items-center justify-between py-1 text-[11px] font-semibold uppercase text-on-surface-variant">
              <span>Classe</span>
              <span className="flex items-center gap-space-md">
                <span>Atual / Meta</span>
                <span className="w-14 text-right">Desvio</span>
              </span>
            </p>
            {rebalance.map((row) => (
              <RebalanceRowItem key={row.className} row={row} />
            ))}
          </div>
        </div>
        <div className="mt-space-md flex items-center justify-between rounded bg-surface-container p-space-xs text-xs">
          <span className="text-on-surface-variant">Aporte sugerido:</span>
          <span className="text-xs font-bold text-secondary">{suggestedContribution}</span>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  iconHint,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconHint?: string;
}) {
  return (
    <div className="mb-space-sm flex items-start justify-between">
      <div>
        <h2 className="font-headline text-base font-semibold text-on-surface">{title}</h2>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
      <SectionIconHint icon={icon} hint={iconHint} />
    </div>
  );
}

function SectionIconHint({ icon, hint }: { icon: string; hint?: string }) {
  if (hint) {
    return (
      <div className="flex items-center gap-space-xs text-xs text-on-surface-variant">
        <MaterialIcon name={icon} size={16} />
        <span>{hint}</span>
      </div>
    );
  }
  return <MaterialIcon name={icon} size={18} className="text-on-surface-variant" />;
}

function AllocationFooter({
  volatility,
  sharpe,
  benchmark,
}: {
  volatility: string;
  sharpe: string;
  benchmark: string;
}) {
  return (
    <div className="mt-space-md flex items-center justify-between border-t border-outline-variant/20 pt-space-md text-xs text-on-surface-variant">
      <div className="flex flex-wrap items-center gap-space-lg">
        <span>
          Volatilidade 12M:{" "}
          <span className="font-semibold tabular-nums text-on-surface">{volatility}</span>
        </span>
        <span>
          Índice Sharpe:{" "}
          <span className="font-semibold tabular-nums text-on-surface">{sharpe}</span>
        </span>
      </div>
      <span className="tabular-nums">
        Benchmark CDI 12M: <span className="font-semibold text-secondary">{benchmark}</span>
      </span>
    </div>
  );
}

function RebalanceRowItem({ row }: { row: RebalanceRow }) {
  const driftColor = row.driftTone === "tertiary" ? "text-tertiary" : "text-secondary";
  return (
    <div className="flex items-center justify-between rounded bg-surface-container px-space-xs py-1.5">
      <span className="font-medium text-on-surface">{row.className}</span>
      <div className="flex items-center gap-space-md">
        <span className="tabular-nums text-on-surface-variant">
          {row.currentPercent} / {row.targetPercent}
        </span>
        <span className={`w-14 text-right text-xs font-semibold tabular-nums ${driftColor}`}>
          {row.driftPercent}
        </span>
      </div>
    </div>
  );
}