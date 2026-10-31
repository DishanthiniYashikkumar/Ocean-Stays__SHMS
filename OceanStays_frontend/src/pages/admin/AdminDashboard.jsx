import { useCallback } from "react";
import { Link } from "react-router-dom";
import ChartCard from "../../components/admin/ChartCard";
import ChannelChart from "../../components/admin/charts/ChannelChart";
import OccupancyChart from "../../components/admin/charts/OccupancyChart";
import RevenueChart from "../../components/admin/charts/RevenueChart";
import RoomTypeChart from "../../components/admin/charts/RoomTypeChart";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { getDashboardStats, getDashboardTrends } from "../../services/userService";
import { getAuditLogs } from "../../services/auditService";
import { formatCurrency, formatRelative, getGreeting } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

/**
 * The admin overview.
 *
 * Every number and series comes from the two existing services —
 * `getDashboardStats()` and `getDashboardTrends()` — bound to their return
 * shapes unchanged. Nothing on this page is computed in JSX.
 */

function AdminDashboard() {
  const { user } = useAuth();

  const loadStats = useCallback(() => getDashboardStats(), []);
  const stats = useAsync(loadStats);

  const loadTrends = useCallback(() => getDashboardTrends(), []);
  const trends = useAsync(loadTrends);

  const loadActivity = useCallback(() => getAuditLogs({ pageSize: 6 }), []);
  const activity = useAsync(loadActivity);

  const s = stats.data;

  /* The eight numbers a general manager actually opens this page for. */
  const tiles = [
    { icon: "bi-door-open", tone: "shms-stat-icon-success", value: s?.availableRooms, label: "Rooms available" },
    { icon: "bi-person-check", tone: "shms-stat-icon-gold", value: s?.occupiedRooms, label: "Rooms occupied" },
    { icon: "bi-graph-up", tone: "", value: s ? `${s.occupancyRate}%` : "—", label: "Occupancy rate" },
    { icon: "bi-box-arrow-in-right", tone: "", value: s?.checkInsToday, label: "Check-ins today" },
    { icon: "bi-box-arrow-right", tone: "", value: s?.checkOutsToday, label: "Check-outs today" },
    { icon: "bi-journal-text", tone: "", value: s?.activeBookings, label: "Active bookings" },
    { icon: "bi-bell", tone: "shms-stat-icon-warning", value: s?.pendingRequests, label: "Open requests" },
    {
      icon: "bi-cash-coin",
      tone: "shms-stat-icon-gold",
      value: s ? formatCurrency(s.revenue, s.currency, { compact: true }) : "—",
      label: "Revenue collected",
      currency: true,
    },
  ];

  /* Operational conditions worth interrupting for. */
  const alerts = [];
  if (s?.maintenanceRooms > 0) {
    alerts.push({
      icon: "bi-tools",
      text: `${s.maintenanceRooms} ${s.maintenanceRooms === 1 ? "room is" : "rooms are"} out of service`,
      to: "/admin/rooms",
    });
  }
  if (s?.pendingRequests > 0) {
    alerts.push({
      icon: "bi-bell",
      text: `${s.pendingRequests} service ${s.pendingRequests === 1 ? "request needs" : "requests need"} attention`,
      to: "/admin/reservations",
    });
  }
  if (s?.cleaningRooms > 0) {
    alerts.push({
      icon: "bi-stars",
      text: `${s.cleaningRooms} ${s.cleaningRooms === 1 ? "room is" : "rooms are"} mid-turnaround`,
      to: "/admin/rooms",
    });
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="shms-heading" style={{ fontSize: "1.7rem", marginBottom: "var(--space-2)" }}>
          {getGreeting()}, {firstName}.
        </h2>
        <p className="shms-subheading" style={{ fontSize: "var(--text-base)" }}>
          {s
            ? `${s.totalRooms} rooms, ${s.occupancyRate}% occupied, ${s.totalBookings} bookings on record.`
            : "Loading today's position…"}
        </p>
      </div>

      {/* ---------------------------------------------------------- KPIs */}
      {stats.error ? (
        <ErrorState
          title="We couldn't load the overview"
          message={stats.error.message}
          onRetry={stats.reload}
        />
      ) : (
        <div className="shms-stats">
          {tiles.map(({ icon, tone, value, label, currency }) => (
            <article className="shms-stat" key={label}>
              <span className={`shms-stat-icon ${tone}`.trim()} aria-hidden="true">
                <i className={`bi ${icon}`} />
              </span>
              <span className="shms-stat-copy">
                <span
                  className={`shms-stat-value shms-kpi-value${currency ? " shms-revenue-value" : ""}`}
                >
                  {stats.isLoading ? "—" : (value ?? 0)}
                </span>
                <span className="shms-stat-label">{label}</span>
              </span>
            </article>
          ))}
        </div>
      )}

      {/* -------------------------------------------------------- Alerts */}
      {!stats.isLoading && alerts.length > 0 && (
        <section className="shms-panel">
          <div className="shms-panel-head">
            <div>
              <h2>Needs attention</h2>
              <p>{alerts.length} operational {alerts.length === 1 ? "item" : "items"}</p>
            </div>
          </div>
          <ul className="shms-rows">
            {alerts.map((alert) => (
              <li key={alert.text}>
                <div className="shms-row">
                  <span className="shms-row-icon" aria-hidden="true">
                    <i className={`bi ${alert.icon}`} />
                  </span>
                  <div className="shms-row-copy">
                    <p className="shms-row-title">{alert.text}</p>
                  </div>
                  <div className="shms-row-aside">
                    <Link className="shms-btn shms-btn-outline shms-btn-sm" to={alert.to}>
                      Review
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- Charts */}
      <div className="shms-chart-grid">
        <ChartCard
          title="Occupancy trend"
          subtitle="Share of rooms occupied, last six months"
          isLoading={trends.isLoading}
          error={trends.error}
          onRetry={trends.reload}
        >
          <OccupancyChart data={trends.data?.occupancy ?? []} />
        </ChartCard>

        <ChartCard
          title="Revenue trend"
          subtitle="Collected revenue by month"
          isLoading={trends.isLoading}
          error={trends.error}
          onRetry={trends.reload}
        >
          <RevenueChart data={trends.data?.revenue ?? []} />
        </ChartCard>

        <ChartCard
          title="Bookings by channel"
          subtitle="Where reservations come from"
          isLoading={trends.isLoading}
          error={trends.error}
          onRetry={trends.reload}
        >
          <ChannelChart data={trends.data?.bookingsByChannel ?? []} />
        </ChartCard>

        <ChartCard
          title="Room type performance"
          subtitle="Revenue contribution by category"
          isLoading={trends.isLoading}
          error={trends.error}
          onRetry={trends.reload}
        >
          <RoomTypeChart data={trends.data?.roomTypePerformance ?? []} />
        </ChartCard>
      </div>

      {/* ------------------------------------------------------ Activity */}
      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>Recent activity</h2>
            <p>The last few actions across the system</p>
          </div>
          <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/admin/audit-logs">
            Full audit log
          </Link>
        </div>

        {activity.error ? (
          <ErrorState message={activity.error.message} onRetry={activity.reload} />
        ) : activity.isLoading ? (
          <div className="shms-panel-body" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="shms-skeleton shms-skeleton-text" />
            ))}
          </div>
        ) : (activity.data?.items?.length ?? 0) === 0 ? (
          <EmptyState title="Nothing logged yet" message="System activity will appear here." icon="bi-clock-history" />
        ) : (
          <ul className="shms-rows">
            {activity.data.items.map((entry) => (
              <li key={entry.id}>
                <div className="shms-row">
                  <span className="shms-row-icon" aria-hidden="true">
                    <i className="bi bi-clock-history" />
                  </span>
                  <div className="shms-row-copy">
                    <p className="shms-row-title">
                      {entry.summary}
                      <StatusBadge status={entry.result} domain="audit" />
                    </p>
                    <p className="shms-row-meta">
                      {entry.actorName} · {entry.module} · {formatRelative(entry.timestamp)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default AdminDashboard;
