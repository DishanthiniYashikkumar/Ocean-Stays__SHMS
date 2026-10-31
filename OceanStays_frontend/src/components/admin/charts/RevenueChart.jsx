import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS, compactNumber } from "./chartTheme";
import { formatCurrency } from "../../../utils/format";

/**
 * Revenue by month.
 *
 * Binds to `getDashboardTrends().revenue` — `[{ month, amount }]`. Bars rather
 * than a line: monthly revenue is a set of discrete totals, not a continuous
 * measurement, and bars say that.
 *
 * @param {{ data: Array<{month: string, amount: number}> }} props
 */
function RevenueChart({ data = [] }) {
  return (
    <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
      <CartesianGrid {...GRID_PROPS} />
      <XAxis dataKey="month" {...AXIS_PROPS} />
      <YAxis {...AXIS_PROPS} tickFormatter={compactNumber} />
      <Tooltip
        content={<ChartTooltip formatter={(value) => formatCurrency(value)} />}
        cursor={{ fill: "rgba(23, 69, 122, 0.06)" }}
      />

      <Bar dataKey="amount" name="Revenue" fill={CHART_COLORS.gold} radius={[6, 6, 0, 0]} />
    </BarChart>
  );
}

export default RevenueChart;
