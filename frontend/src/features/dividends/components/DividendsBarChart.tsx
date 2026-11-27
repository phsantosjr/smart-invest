import { AppBarChart, type AppBarChartPoint } from "../../../components/charts/AppBarChart";

export type DividendsChartBar = {
  label: string;
  value: number;
};

type DividendsBarChartProps = {
  bars: DividendsChartBar[];
  ariaLabel: string;
  barClassName?: string;
};

export function DividendsBarChart({
  bars,
  ariaLabel,
  barClassName = "bg-secondary",
}: DividendsBarChartProps) {
  const fill = barClassName.includes("primary") ? "primary" : "secondary";
  const data: AppBarChartPoint[] = bars.map((bar) => ({
    label: bar.label,
    value: bar.value,
  }));

  return (
    <AppBarChart
      data={data}
      ariaLabel={ariaLabel}
      fill={fill}
      slantXLabels={bars.length > 8}
    />
  );
}