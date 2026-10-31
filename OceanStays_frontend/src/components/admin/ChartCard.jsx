import { ResponsiveContainer } from "recharts";
import ErrorState from "../common/ErrorState";
import "../../styles/admin.css";

/**
 * Consistent framing for every chart: panel, heading, and a responsive
 * container so the plot reflows rather than overflowing on a phone.
 *
 * Handles its own loading and error states so each chart component only has to
 * describe the plot itself.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   height?: number,
 *   isLoading?: boolean,
 *   error?: Error|null,
 *   onRetry?: () => void,
 *   action?: React.ReactNode,
 *   children: React.ReactElement    A single Recharts chart element
 * }} props
 */
function ChartCard({
  title,
  subtitle,
  height = 280,
  isLoading = false,
  error = null,
  onRetry,
  action,
  children,
}) {
  return (
    <section className="shms-panel shms-chart-card">
      <div className="shms-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="shms-panel-body">
        {error ? (
          <ErrorState message={error.message} onRetry={onRetry} />
        ) : isLoading ? (
          <div
            className="shms-skeleton"
            style={{ height, borderRadius: "var(--radius-md)" }}
            aria-hidden="true"
          />
        ) : (
          <div className="shms-chart" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

export default ChartCard;
