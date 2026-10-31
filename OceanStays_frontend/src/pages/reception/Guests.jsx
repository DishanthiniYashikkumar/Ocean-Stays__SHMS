import { useCallback, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { getGuestBookings } from "../../services/bookingService";
import { ROLES, getUsers } from "../../services/userService";
import { formatCurrency, formatDate, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/** Guest directory, with each guest's stay history a click away. */

/** Loads one guest's stays on demand, rather than for every row up front. */
function GuestStays({ guestId }) {
  const load = useCallback(() => getGuestBookings(guestId), [guestId]);
  const { data, isLoading, error } = useAsync(load);

  if (isLoading) {
    return (
      <div aria-hidden="true">
        <div className="shms-skeleton shms-skeleton-text" />
        <div className="shms-skeleton shms-skeleton-text" style={{ width: "70%" }} />
      </div>
    );
  }

  if (error) {
    return <p className="shms-row-meta">We couldn&apos;t load this guest&apos;s stays.</p>;
  }

  const stays = [...data.current, ...data.upcoming, ...data.past];

  if (stays.length === 0) {
    return <p className="shms-row-meta">No bookings on record for this guest.</p>;
  }

  return (
    <ul className="shms-rows" style={{ margin: 0 }}>
      {stays.map((booking) => (
        <li key={booking.id}>
          <div className="shms-row" style={{ paddingInline: 0 }}>
            <div className="shms-row-copy">
              <p className="shms-row-title">
                {booking.roomTypeName}
                <StatusBadge status={booking.status} domain="booking" />
              </p>
              <p className="shms-row-meta">
                {booking.reference} · {formatDateRange(booking.checkIn, booking.checkOut)}
                {booking.roomNumber && ` · Room ${booking.roomNumber}`}
              </p>
            </div>
            <div className="shms-row-aside">
              <span className="shms-row-amount">
                {formatCurrency(booking.total, booking.currency)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Guests() {
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => getUsers({ role: ROLES.GUEST, pageSize: 200 }), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const columns = [
    {
      key: "name",
      header: "Guest",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.name}</span>,
    },
    { key: "email", header: "Email", sortable: true },
    { key: "phone", header: "Phone" },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="user" />,
    },
    {
      key: "createdAt",
      header: "Member since",
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="shms-row-actions">
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => setDetail(row)}
          >
            View stays
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search name, email or phone"
        searchKeys={["name", "email", "phone"]}
        caption="Registered guests"
        emptyState={{
          title: "No guests yet",
          message: "Guests who register or book will appear here.",
          icon: "bi-people",
        }}
      />

      {detail && (
        <Modal
          title={detail.name}
          subtitle={`${detail.email} · ${detail.phone}`}
          icon="bi-person"
          size="lg"
          onClose={() => setDetail(null)}
          footer={
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          }
        >
          <dl className="shms-defs" style={{ marginBottom: "var(--space-6)" }}>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={detail.status} domain="user" />
              </dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDate(detail.lastLoginAt)}</dd>
            </div>
          </dl>

          <p className="shms-label">Stay history</p>
          <GuestStays guestId={detail.id} />
        </Modal>
      )}
    </>
  );
}

export default Guests;
