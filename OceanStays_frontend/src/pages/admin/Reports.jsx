import { useCallback, useMemo, useState } from "react";
import ChartCard from "../../components/admin/ChartCard";
import OccupancyChart from "../../components/admin/charts/OccupancyChart";
import RevenueChart from "../../components/admin/charts/RevenueChart";
import DataTable from "../../components/common/DataTable";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { getBookings } from "../../services/bookingService";
import { getPayments } from "../../services/paymentService";
import { getServiceRequests } from "../../services/serviceRequestService";
import { getDashboardTrends } from "../../services/userService";
import { formatCurrency, formatDate, formatDateRange, todayISO, addDays } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

/**
 * Management reports.
 *
 * Four reports over a date range, each built from a service the app already
 * has. Export is CSV written with a Blob and an object URL — no package, and
 * nothing leaves the browser.
 */

const REPORTS = [
  { id: "occupancy", label: "Occupancy", icon: "bi-graph-up" },
  { id: "revenue", label: "Revenue", icon: "bi-cash-coin" },
  { id: "reservations", label: "Reservations", icon: "bi-journal-text" },
  { id: "requests", label: "Service requests", icon: "bi-bell" },
];

/** Escapes a CSV cell — quotes, commas and newlines all need handling. */
function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, headers, rows) {
  const body = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  // Leading BOM so Excel reads the file as UTF-8 rather than mangling accents.
  const blob = new Blob(["﻿", body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Reports() {
  const toast = useToast();

  const [report, setReport] = useState("occupancy");
  const [from, setFrom] = useState(() => addDays(todayISO(), -180));
  const [to, setTo] = useState(() => addDays(todayISO(), 60));

  const loadTrends = useCallback(() => getDashboardTrends(), []);
  const trends = useAsync(loadTrends);

  const loadBookings = useCallback(() => getBookings({ pageSize: 500 }), []);
  const bookings = useAsync(loadBookings);

  const loadPayments = useCallback(() => getPayments(), []);
  const payments = useAsync(loadPayments);

  const loadRequests = useCallback(() => getServiceRequests({ pageSize: 500 }), []);
  const requests = useAsync(loadRequests);

  /* ---- Date-filtered sets ------------------------------------------------ */

  const bookingRows = useMemo(
    () => (bookings.data?.items ?? []).filter((b) => b.checkIn >= from && b.checkIn <= to),
    [bookings.data, from, to],
  );

  const paymentRows = useMemo(
    () => (payments.data ?? []).filter((p) => p.issuedAt >= from && p.issuedAt <= to),
    [payments.data, from, to],
  );

  const requestRows = useMemo(
    () =>
      (requests.data?.items ?? []).filter((r) => {
        const day = r.createdAt.slice(0, 10);
        return day >= from && day <= to;
      }),
    [requests.data, from, to],
  );

  /* ---- Summary ----------------------------------------------------------- */

  const summary = useMemo(() => {
    if (report === "revenue") {
      const collected = paymentRows.reduce((sum, p) => sum + p.amountPaid, 0);
      const outstanding = paymentRows.reduce((sum, p) => sum + p.balanceDue, 0);
      return [
        { label: "Invoices", value: paymentRows.length },
        { label: "Collected", value: formatCurrency(collected) },
        { label: "Outstanding", value: formatCurrency(outstanding) },
      ];
    }
    if (report === "reservations") {
      const nights = bookingRows.reduce((sum, b) => sum + b.nights, 0);
      const value = bookingRows.reduce((sum, b) => sum + b.total, 0);
      return [
        { label: "Reservations", value: bookingRows.length },
        { label: "Room nights", value: nights },
        { label: "Total value", value: formatCurrency(value) },
      ];
    }
    if (report === "requests") {
      const done = requestRows.filter((r) => r.status === "COMPLETED").length;
      return [
        { label: "Requests", value: requestRows.length },
        { label: "Completed", value: done },
        {
          label: "Completion rate",
          value: requestRows.length ? `${Math.round((done / requestRows.length) * 100)}%` : "—",
        },
      ];
    }

    const series = trends.data?.occupancy ?? [];
    const average = series.length
      ? Math.round(series.reduce((sum, point) => sum + point.rate, 0) / series.length)
      : 0;
    const peak = series.reduce((best, point) => (point.rate > (best?.rate ?? 0) ? point : best), null);
    return [
      { label: "Months covered", value: series.length },
      { label: "Average occupancy", value: `${average}%` },
      { label: "Peak month", value: peak ? `${peak.month} · ${peak.rate}%` : "—" },
    ];
  }, [report, bookingRows, paymentRows, requestRows, trends.data]);

  /* ---- Export ------------------------------------------------------------ */

  function handleExport() {
    const stamp = `${from}_to_${to}`;

    if (report === "reservations") {
      downloadCsv(
        `ocean-stays-reservations_${stamp}.csv`,
        ["Reference", "Guest", "Room type", "Check-in", "Check-out", "Nights", "Status", "Payment", "Total"],
        bookingRows.map((b) => [
          b.reference, b.guestName, b.roomTypeName, b.checkIn, b.checkOut,
          b.nights, b.status, b.paymentStatus, b.total,
        ]),
      );
    } else if (report === "revenue") {
      downloadCsv(
        `ocean-stays-revenue_${stamp}.csv`,
        ["Invoice", "Booking", "Guest", "Issued", "Status", "Total", "Paid", "Outstanding"],
        paymentRows.map((p) => [
          p.reference, p.bookingReference, p.guestName, p.issuedAt,
          p.status, p.total, p.amountPaid, p.balanceDue,
        ]),
      );
    } else if (report === "requests") {
      downloadCsv(
        `ocean-stays-requests_${stamp}.csv`,
        ["Reference", "Type", "Title", "Guest", "Room", "Priority", "Status", "Assigned", "Raised"],
        requestRows.map((r) => [
          r.reference, r.type, r.title, r.guestName ?? "", r.roomNumber ?? "",
          r.priority, r.status, r.assignedToName ?? "", r.createdAt,
        ]),
      );
    } else {
      downloadCsv(
        `ocean-stays-occupancy_${stamp}.csv`,
        ["Month", "Occupancy %"],
        (trends.data?.occupancy ?? []).map((point) => [point.month, point.rate]),
      );
    }

    toast.success("Report downloaded as CSV.", { title: "Export ready" });
  }

  /* ---- Table per report -------------------------------------------------- */

  const tables = {
    reservations: {
      state: bookings,
      rows: bookingRows,
      key: (row) => row.id,
      caption: "Reservations in range",
      searchKeys: ["reference", "guestName", "roomTypeName"],
      columns: [
        { key: "reference", header: "Reference", sortable: true },
        { key: "guestName", header: "Guest", sortable: true },
        { key: "roomTypeName", header: "Room type", sortable: true },
        {
          key: "checkIn",
          header: "Stay",
          sortable: true,
          render: (row) => formatDateRange(row.checkIn, row.checkOut),
        },
        { key: "nights", header: "Nights", align: "center", sortable: true },
        {
          key: "status",
          header: "Status",
          sortable: true,
          render: (row) => <StatusBadge status={row.status} domain="booking" />,
        },
        {
          key: "total",
          header: "Value",
          align: "right",
          sortable: true,
          render: (row) => (
            <span className="shms-cell-numeric">{formatCurrency(row.total, row.currency)}</span>
          ),
        },
      ],
    },
    revenue: {
      state: payments,
      rows: paymentRows,
      key: (row) => row.id,
      caption: "Invoices in range",
      searchKeys: ["reference", "guestName", "bookingReference"],
      columns: [
        { key: "reference", header: "Invoice", sortable: true },
        { key: "guestName", header: "Guest", sortable: true },
        {
          key: "issuedAt",
          header: "Issued",
          sortable: true,
          render: (row) => formatDate(row.issuedAt),
        },
        {
          key: "status",
          header: "Status",
          sortable: true,
          render: (row) => <StatusBadge status={row.status} domain="payment" />,
        },
        {
          key: "total",
          header: "Total",
          align: "right",
          sortable: true,
          render: (row) => (
            <span className="shms-cell-numeric">{formatCurrency(row.total, row.currency)}</span>
          ),
        },
        {
          key: "balanceDue",
          header: "Outstanding",
          align: "right",
          sortable: true,
          render: (row) => (
            <span className="shms-cell-numeric">
              {row.balanceDue > 0 ? formatCurrency(row.balanceDue, row.currency) : "—"}
            </span>
          ),
        },
      ],
    },
    requests: {
      state: requests,
      rows: requestRows,
      key: (row) => row.id,
      caption: "Service requests in range",
      searchKeys: ["reference", "title", "guestName", "roomNumber"],
      columns: [
        { key: "reference", header: "Reference", sortable: true },
        { key: "title", header: "Request", sortable: true },
        { key: "type", header: "Type", sortable: true },
        {
          key: "priority",
          header: "Priority",
          sortable: true,
          render: (row) => <StatusBadge status={row.priority} domain="priority" />,
        },
        {
          key: "status",
          header: "Status",
          sortable: true,
          render: (row) => <StatusBadge status={row.status} domain="request" />,
        },
        {
          key: "assignedToName",
          header: "Assigned",
          sortable: true,
          render: (row) => row.assignedToName ?? <span className="shms-cell-muted">—</span>,
        },
      ],
    },
  };

  const active = tables[report];

  return (
    <>
      {/* ------------------------------------------------------- Controls */}
      <div className="shms-report-bar">
        <div className="shms-field" style={{ minWidth: 190 }}>
          <label className="shms-label" htmlFor="report-type">
            Report
          </label>
          <div className="shms-input-shell">
            <select
              id="report-type"
              className="shms-input shms-input-bare"
              value={report}
              onChange={(event) => setReport(event.target.value)}
            >
              {REPORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="shms-field">
          <label className="shms-label" htmlFor="report-from">
            From
          </label>
          <div className="shms-input-shell">
            <input
              id="report-from"
              type="date"
              className="shms-input shms-input-bare"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
        </div>

        <div className="shms-field">
          <label className="shms-label" htmlFor="report-to">
            To
          </label>
          <div className="shms-input-shell">
            <input
              id="report-to"
              type="date"
              className="shms-input shms-input-bare"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        <div className="shms-report-actions">
          <button type="button" className="shms-btn shms-btn-primary" onClick={handleExport}>
            <i className="bi bi-download" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------- Summary */}
      <div className="shms-stats">
        {summary.map(({ label, value }) => (
          <article className="shms-stat" key={label}>
            <span className="shms-stat-icon" aria-hidden="true">
              <i className={`bi ${REPORTS.find((r) => r.id === report)?.icon ?? "bi-graph-up"}`} />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value">{value}</span>
              <span className="shms-stat-label">{label}</span>
            </span>
          </article>
        ))}
      </div>

      {/* ---------------------------------------------------------- Body */}
      {report === "occupancy" ? (
        <ChartCard
          title="Occupancy by month"
          subtitle="Share of rooms occupied"
          height={340}
          isLoading={trends.isLoading}
          error={trends.error}
          onRetry={trends.reload}
        >
          <OccupancyChart data={trends.data?.occupancy ?? []} />
        </ChartCard>
      ) : report === "revenue" ? (
        <>
          <ChartCard
            title="Revenue by month"
            subtitle="Collected revenue"
            height={300}
            isLoading={trends.isLoading}
            error={trends.error}
            onRetry={trends.reload}
          >
            <RevenueChart data={trends.data?.revenue ?? []} />
          </ChartCard>

          <DataTable
            columns={active.columns}
            rows={active.rows}
            rowKey={active.key}
            isLoading={active.state.isLoading}
            error={active.state.error}
            onRetry={active.state.reload}
            searchKeys={active.searchKeys}
            searchPlaceholder="Search this report"
            caption={active.caption}
            emptyState={{
              title: "Nothing in this range",
              message: "Widen the date range to see more.",
              icon: "bi-calendar-range",
            }}
          />
        </>
      ) : active ? (
        <DataTable
          columns={active.columns}
          rows={active.rows}
          rowKey={active.key}
          isLoading={active.state.isLoading}
          error={active.state.error}
          onRetry={active.state.reload}
          searchKeys={active.searchKeys}
          searchPlaceholder="Search this report"
          caption={active.caption}
          emptyState={{
            title: "Nothing in this range",
            message: "Widen the date range to see more.",
            icon: "bi-calendar-range",
          }}
        />
      ) : (
        <ErrorState title="Unknown report" message="Pick a report from the list above." />
      )}
    </>
  );
}

export default Reports;
