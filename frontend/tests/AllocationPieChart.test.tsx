import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AllocationPieChart } from "../src/features/portfolio/components/AllocationPieChart";
import type { AllocationSlice } from "../src/types/portfolio";

const slices: AllocationSlice[] = [
  {
    id: "FII",
    label: "FII",
    value: 400,
    percent: 40,
    amount: "R$ 400,00",
    colorClass: "bg-secondary",
    colorVar: "--si-secondary",
  },
  {
    id: "STOCK",
    label: "Ações",
    value: 600,
    percent: 60,
    amount: "R$ 600,00",
    colorClass: "bg-primary",
    colorVar: "--si-primary",
  },
  {
    id: "FIXED_INCOME",
    label: "Renda Fixa",
    value: 0,
    percent: 0,
    amount: "R$ 0,00",
    colorClass: "bg-outline",
    colorVar: "--si-outline",
  },
  {
    id: "TREASURY",
    label: "Tesouro",
    value: 0,
    percent: 0,
    amount: "R$ 0,00",
    colorClass: "bg-tertiary",
    colorVar: "--si-tertiary",
  },
];

describe("AllocationPieChart", () => {
  it("renders current value totals by category in a table next to the pie", () => {
    render(<AllocationPieChart allocation={slices} />);

    expect(screen.getByRole("heading", { name: "Valor atual por categoria" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Alocação por valor atual/i })).toBeTruthy();
    expect(screen.getByRole("row", { name: /Ações/ }).textContent).toContain("R$ 600,00");
    expect(screen.getByRole("row", { name: /FII/ }).textContent).toContain("R$ 400,00");
    expect(screen.getByRole("row", { name: /Renda Fixa/ }).textContent).toContain("R$ 0,00");
    expect(screen.getByRole("row", { name: /Tesouro/ }).textContent).toContain("R$ 0,00");
  });

  it("shows an empty message when there is no allocation data", () => {
    render(<AllocationPieChart allocation={[]} />);

    expect(
      screen.getByText("Nenhuma posição com valor para exibir no gráfico."),
    ).toBeTruthy();
  });
});
