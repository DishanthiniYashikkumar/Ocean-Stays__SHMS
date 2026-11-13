import CountUp from "./CountUp";
/**
 * KPI tile: an icon chip, a figure and a label.
 *
 *   <StatCard icon="bi-calendar2-event" value={3} label="Upcoming bookings" kpi />
 *
 * `tone` picks the chip colour (default is the teal accent tint). `kpi` sets
 * the figure in tabular sans digits; pass `valueClassName` for the currency
 * variants (`shms-revenue-value`, `shms-payment-total`).
 *
 * @param {{
 *   icon: string,
 *   value: import("react").ReactNode,
 *   label: import("react").ReactNode,
 *   tone?: "accent" | "success" | "warning" | "info" | "danger" | "gold",
 *   kpi?: boolean,
 *   valueClassName?: string,
 *   className?: string,
 * }} props
 */
function StatCard({ icon, value, label, tone, kpi = false, valueClassName = "", className = "" }) {
  const iconClass = ["shms-stat-icon", tone ? `shms-stat-icon-${tone}` : ""].filter(Boolean).join(" ");
  const valueClass = ["shms-stat-value", kpi ? "shms-kpi-value" : "", valueClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={`shms-stat ${className}`.trim()}>
      <span className={iconClass} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <span className="shms-stat-copy">
        <span className={valueClass}>
          {typeof value === "number" || typeof value === "string" ? <CountUp value={value} /> : value}
        </span>
        <span className="shms-stat-label">{label}</span>
      </span>
    </article>
  );
}

export default StatCard;
