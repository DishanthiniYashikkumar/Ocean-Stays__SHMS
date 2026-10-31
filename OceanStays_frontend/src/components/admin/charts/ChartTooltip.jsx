import "../../../styles/admin.css";

/**
 * Shared Recharts tooltip, styled from the design tokens rather than
 * Recharts' default white box.
 *
 * @param {{
 *   active?: boolean,
 *   payload?: Array,
 *   label?: string,
 *   formatter?: (value, entry) => string
 * }} props
 */
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="shms-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey ?? entry.name}>
          {entry.name}: <b>{formatter ? formatter(entry.value, entry) : entry.value}</b>
        </span>
      ))}
    </div>
  );
}

export default ChartTooltip;
