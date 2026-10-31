import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { CATEGORY_COLORS } from "./chartTheme";

/**
 * Where bookings come from.
 *
 * Binds to `getDashboardTrends().bookingsByChannel` — `[{ channel, count }]`.
 * A donut is defensible here because there are only four slices and they are
 * parts of one whole; it would not be for anything with more categories.
 *
 * @param {{ data: Array<{channel: string, count: number}> }} props
 */
function ChannelChart({ data = [] }) {
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="count"
        nameKey="channel"
        innerRadius="52%"
        outerRadius="78%"
        paddingAngle={2}
        stroke="none"
      >
        {data.map((entry, index) => (
          <Cell key={entry.channel} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
        ))}
      </Pie>

      <Tooltip content={<ChartTooltip formatter={(value) => `${value} bookings`} />} />
      <Legend
        verticalAlign="bottom"
        iconType="circle"
        iconSize={9}
        formatter={(value) => <span style={{ color: "var(--body)" }}>{value}</span>}
      />
    </PieChart>
  );
}

export default ChannelChart;
