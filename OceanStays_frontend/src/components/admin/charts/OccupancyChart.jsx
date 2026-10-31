import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from "./chartTheme";

/**
 * Occupancy rate over the last six months.
 *
 * Binds to `getDashboardTrends().occupancy` — `[{ month, rate }]` — exactly as
 * the service returns it. An area rather than a line because the shaded region
 * makes the seasonal peak read at a glance.
 *
 * @param {{ data: Array<{month: string, rate: number}> }} props
 */
function OccupancyChart({ data = [] }) {
  return (
    <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
      <defs>
        <linearGradient id="shms-occupancy-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.navy} stopOpacity={0.28} />
          <stop offset="100%" stopColor={CHART_COLORS.navy} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      <CartesianGrid {...GRID_PROPS} />
      <XAxis dataKey="month" {...AXIS_PROPS} />
      <YAxis {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
      <Tooltip
        content={<ChartTooltip formatter={(value) => `${value}%`} />}
        cursor={{ stroke: CHART_COLORS.line }}
      />

      <Area
        type="monotone"
        dataKey="rate"
        name="Occupancy"
        stroke={CHART_COLORS.navy}
        strokeWidth={2}
        fill="url(#shms-occupancy-fill)"
      />
    </AreaChart>
  );
}

export default OccupancyChart;
