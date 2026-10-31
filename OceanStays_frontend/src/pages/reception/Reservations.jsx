import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { BOOKING_STATUS, cancelBooking, getBookings } from "../../services/bookingService";
import { formatCurrency, formatDate, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Every reservation, past and future.
 *
 * Fetches the full set and lets DataTable handle search, sort and paging —
 * see the note in DataTable.jsx about why sorting a server-paginated page
 * would mislead.
 */

const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: BOOKING_STATUS.PENDING, label: "Pending" },
  { value: BOOKING_STATUS.CONFIRMED, label: "Confirmed" },
  { value: BOOKING_STATUS.CHECKED_IN, label: "Checked in" },
  { value: BOOKING_STATUS.CHECKED_OUT, label: "Checked out" },
  { value: BOOKING_STATUS.CANCELLED, label: "Cancelled" },
];

function Reservations() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  // pageSize 200 fetches the whole book; DataTable pages it client-side.
  const load = useCallback(() => getBookings({ pageSize: 200 }), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return status ? items.filter((booking) => booking.status === status) : items;
  }, [data, status]);

  async function handleCancel() {
    try {
      await cancelBooking(cancelling.id, "Cancelled at the front desk");
      toast.success(`${cancelling.reference} cancelled and the room released.`);
      setCancelling(null);
      setDetail(null);
      reload();
    } catch (cancelError) {
      toast.error(cancelError.message || "We couldn't cancel that booking.");
      setCancelling(null);
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.reference}</span>,
    },
    {
      key: "guestName",
      header: "Guest",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">{row.guestName}</span>
          <br />
          <span className="shms-cell-muted">{row.guestEmail}</span>
        </>
      ),
    },
    { key: "roomTypeName", header: "Room", sortable: true },
    {
      key: "checkIn",
      header: "Stay",
      sortable: true,
      render: (row) => (
        <>
          {formatDateRange(row.checkIn, row.checkOut)}
          <br />
          <span className="shms-cell-muted">
            {row.nights} {row.nights === 1 ? "night" : "nights"}
          </span>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="booking" />,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      render: (row) => <StatusBadge status={row.paymentStatus} domain="payment" />,
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
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search reference, guest or email"
        searchKeys={["reference", "guestName", "guestEmail", "roomTypeName"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="All reservations"
        emptyState={{
          title: "No reservations",
          message: "Bookings taken online or at the desk will appear here.",
          icon: "bi-journal-text",
        }}
      />

      {/* --------------------------------------------------------- Detail */}
      {detail && (
        <Modal
          title={detail.reference}
          subtitle={`${detail.guestName} · ${detail.roomTypeName}`}
          icon="bi-journal-text"
          size="lg"
          onClose={() => setDetail(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="shms-btn shms-btn-danger"
                onClick={() => setCancelling(detail)}
                disabled={[BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CHECKED_OUT].includes(
                  detail.status,
                )}
              >
                Cancel booking
              </button>
            </>
          }
        >
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
            <StatusBadge status={detail.status} domain="booking" />
            <StatusBadge status={detail.paymentStatus} domain="payment" />
          </div>

          <dl className="shms-defs">
            <div>
              <dt>Guest</dt>
              <dd>{detail.guestName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detail.guestEmail}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{detail.guestPhone}</dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>{formatDateRange(detail.checkIn, detail.checkOut)}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{detail.roomNumber ?? "Not allocated"}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>
                {detail.guests.adults} adults
                {detail.guests.children > 0 && `, ${detail.guests.children} children`}
              </dd>
            </div>
            <div>
              <dt>Booked on</dt>
              <dd>{formatDate(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatCurrency(detail.total, detail.currency)}</dd>
            </div>
          </dl>

          {detail.specialRequests && (
            <div style={{ marginTop: "var(--space-5)" }}>
              <p className="shms-label">Special requests</p>
              <p className="shms-row-meta" style={{ fontSize: "var(--text-sm)" }}>
                {detail.specialRequests}
              </p>
            </div>
          )}
        </Modal>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this reservation?"
          message={`${cancelling.reference} for ${cancelling.guestName} will be cancelled and the room released. Any payment is refunded to the original method.`}
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep it"
          onConfirm={handleCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </>
  );
}

export default Reservations;
