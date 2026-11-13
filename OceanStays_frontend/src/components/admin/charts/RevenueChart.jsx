import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { compactNumber, useChartTheme } from "./chartTheme";
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
  const { colors, axisProps, gridProps } = useChartTheme();

  return (
    <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
      <CartesianGrid {...gridProps} />
      <XAxis dataKey="month" {...axisProps} />
      <YAxis {...axisProps} tickFormatter={compactNumber} />
      <Tooltip
        content={<ChartTooltip formatter={(value) => formatCurrency(value)} />}
        cursor={{ fill: colors.cursor }}
      />

      <Bar dataKey="amount" name="Revenue" fill={colors.accent} radius={[6, 6, 0, 0]} />
    </BarChart>
  );
}

export default RevenueChart;
