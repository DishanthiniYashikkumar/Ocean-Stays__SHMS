/**
 * Chart palette and shared Recharts props.
 *
 * The colours are the Ocean Stays brand values from tokens.css, restated here
 * as literals because Recharts writes them into SVG attributes where a CSS
 * custom property would not resolve. Keep them in step with tokens.css — this
 * is the one place in the app that repeats a brand colour, and it does so under
 * protest.
 */

export const CHART_COLORS = {
  navy: "#17457a",
  navyDeep: "#0a2140",
  gold: "#c9a227",
  goldLight: "#d9b84a",
  success: "#1e7a5a",
  warning: "#b47709",
  danger: "#c0392b",
  line: "#e3e8f0",
  muted: "#8b95a8",
};

/** Sequence used when a chart plots one colour per category. */
export const CATEGORY_COLORS = [
  CHART_COLORS.navy,
  CHART_COLORS.gold,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.navyDeep,
];

/** Axis defaults, so every chart's axes look the same. */
export const AXIS_PROPS = {
  stroke: CHART_COLORS.muted,
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.line },
};

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: CHART_COLORS.line,
  vertical: false,
};

/** Compact axis labels — "6.4M" reads better on a phone than "6,380,000". */
export function compactNumber(value) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
