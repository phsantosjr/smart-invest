import type { CSSProperties } from "react";

/** Shared Recharts tooltip + axis styling aligned with Smart Invest tokens. */

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "var(--si-surface-container-highest)",
  border: "1px solid var(--si-outline-variant)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--si-on-surface)",
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--si-on-surface)",
  fontWeight: 600,
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--si-on-surface-variant)",
  fontSize: 10,
  marginBottom: 4,
};

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: "var(--si-on-surface-variant)",
} as const;

export const CHART_COLORS = {
  secondary: "var(--si-secondary)",
  primary: "var(--si-primary)",
} as const;