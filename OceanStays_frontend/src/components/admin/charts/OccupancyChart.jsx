import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { useChartTheme } from "./chartTheme";

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
  const { colors, axisProps, gridProps } = useChartTheme();

  return (
    <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
      <defs>
        <linearGradient id="shms-occupancy-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.28} />
          <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      <CartesianGrid {...gridProps} />
      <XAxis dataKey="month" {...axisProps} />
      <YAxis {...axisProps} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
      <Tooltip
        content={<ChartTooltip formatter={(value) => `${value}%`} />}
        cursor={{ stroke: colors.line }}
      />

      <Area
        type="monotone"
        dataKey="rate"
        name="Occupancy"
        stroke={colors.accent}
        strokeWidth={2}
        fill="url(#shms-occupancy-fill)"
      />
    </AreaChart>
  );
}

export default OccupancyChart;
