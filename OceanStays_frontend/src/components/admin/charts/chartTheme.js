import { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";

/**
 * Chart palette and shared Recharts props.
 *
 * Recharts writes colours into SVG attributes, so the values are read from the
 * CSS custom properties in tokens.css (`--chart-*`) at render time and the
 * charts re-render when the theme changes. Use the `useChartTheme()` hook in
 * chart components; the static exports below are the light-theme fallbacks.
 */

const LIGHT_FALLBACK = {
  primary: "#17457a",
  accent: "#12968b",
  success: "#1e7a5a",
  warning: "#b47709",
  deep: "#0a2140",
  line: "#e2e7ef",
  axis: "#5f6a7e",
  cursor: "rgba(23, 69, 122, 0.06)",
};

function readTokens() {
  if (typeof window === "undefined" || typeof document === "undefined") return LIGHT_FALLBACK;
  const styles = window.getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  return {
    primary: read("--chart-1", LIGHT_FALLBACK.primary),
    accent: read("--chart-2", LIGHT_FALLBACK.accent),
    success: read("--chart-3", LIGHT_FALLBACK.success),
    warning: read("--chart-4", LIGHT_FALLBACK.warning),
    deep: read("--chart-5", LIGHT_FALLBACK.deep),
    line: read("--chart-grid", LIGHT_FALLBACK.line),
    axis: read("--chart-axis", LIGHT_FALLBACK.axis),
    cursor: read("--chart-cursor", LIGHT_FALLBACK.cursor),
  };
}

function buildTheme(colors) {
  return {
    colors,
    /** Sequence used when a chart plots one colour per category. */
    categoryColors: [colors.primary, colors.accent, colors.success, colors.warning, colors.deep],
    /** Axis defaults, so every chart's axes look the same (AA-contrast ticks). */
    axisProps: {
      stroke: colors.axis,
      tick: { fill: colors.axis, fontSize: 12 },
      tickLine: false,
      axisLine: { stroke: colors.line },
    },
    gridProps: {
      strokeDasharray: "3 3",
      stroke: colors.line,
      vertical: false,
    },
  };
}

/**
 * Theme-aware chart colours. Re-computes whenever light/dark changes.
 *
 *   const { colors, axisProps, gridProps, categoryColors } = useChartTheme();
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  // resolvedTheme is the dependency that makes this re-read the CSS variables.
  return useMemo(() => buildTheme(readTokens()), [resolvedTheme]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---- Static light-theme exports (kept for any non-hook callers) -------- */

const STATIC = buildTheme(LIGHT_FALLBACK);

export const CHART_COLORS = {
  navy: LIGHT_FALLBACK.primary,
  navyDeep: LIGHT_FALLBACK.deep,
  gold: LIGHT_FALLBACK.accent,
  goldLight: LIGHT_FALLBACK.accent,
  success: LIGHT_FALLBACK.success,
  warning: LIGHT_FALLBACK.warning,
  danger: "#c0392b",
  line: LIGHT_FALLBACK.line,
  muted: LIGHT_FALLBACK.axis,
};

export const CATEGORY_COLORS = STATIC.categoryColors;
export const AXIS_PROPS = STATIC.axisProps;
export const GRID_PROPS = STATIC.gridProps;

/** Compact axis labels — "6.4M" reads better on a phone than "6,380,000". */
export function compactNumber(value) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
