import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { compactNumber, useChartTheme } from "./chartTheme";
import { formatCurrency } from "../../../utils/format";

/**
 * Revenue by room type.
 *
 * Binds to `getDashboardTrends().roomTypePerformance` —
 * `[{ name, bookings, revenue }]`. Horizontal, because room type names are long
 * enough that vertical bars would force them to rotate and stop being readable.
 *
 * @param {{ data: Array<{name: string, bookings: number, revenue: number}> }} props
 */
function RoomTypeChart({ data = [] }) {
  const { colors, axisProps, gridProps } = useChartTheme();

  return (
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 16, left: 24, bottom: 0 }}
      barCategoryGap="28%"
    >
      <CartesianGrid {...gridProps} horizontal={false} vertical />
      <XAxis type="number" {...axisProps} tickFormatter={compactNumber} />
      <YAxis type="category" dataKey="name" {...axisProps} width={104} />
      <Tooltip
        content={
          <ChartTooltip
            formatter={(value, entry) =>
              entry.dataKey === "revenue" ? formatCurrency(value) : `${value} bookings`
            }
          />
        }
        cursor={{ fill: colors.cursor }}
      />

      <Bar dataKey="revenue" name="Revenue" fill={colors.primary} radius={[0, 6, 6, 0]} />
    </BarChart>
  );
}

export default RoomTypeChart;
