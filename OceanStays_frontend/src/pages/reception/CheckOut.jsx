import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { PAYMENT_STATUS, checkOutBooking, getFrontDeskSummary } from "../../services/bookingService";
import { confirmPayment, createPaymentIntent } from "../../services/paymentService";
import { formatCurrency, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Today's departures.
 *
 * Checking a guest out does two things beyond closing the booking: it settles
 * any outstanding balance first, and it drops the room into CLEANING so
 * housekeeping picks it up. Skipping the second is how a room silently reads
 * "available" while the last guest's towels are still on the floor.
 */
function CheckOut() {
  const toast = useToast();
  const [settling, setSettling] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadDesk = useCallback(() => getFrontDeskSummary(), []);
  const desk = useAsync(loadDesk);

  const departures = useMemo(() => desk.data?.departures ?? [], [desk.data]);

  async function handleCheckOut(booking, { takePayment }) {
    setIsSaving(true);

    try {
      if (takePayment) {
        const intent = await createPaymentIntent({
          bookingId: booking.id,
          amount: booking.total,
          method: "card",
        });
        await confirmPayment({
          intentId: intent.intentId,
          bookingId: booking.id,
          providerToken: intent.clientSecret,
        });
      }

      // checkOutBooking also hands the room to housekeeping.
      await checkOutBooking(booking.id);

      toast.success(
        takePayment
          ? `${booking.guestName} checked out and ${formatCurrency(booking.total, booking.currency)} settled.`
          : `${booking.guestName} checked out. Room ${booking.roomNumber ?? "—"} sent to housekeeping.`,
        { title: "Checked out" },
      );
      setSettling(null);
      desk.reload();
    } catch (checkOutError) {
      toast.error(checkOutError.message || "We couldn't complete that check-out.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "guestName",
      header: "Guest",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">{row.guestName}</span>
          <br />
          <span className="shms-cell-muted">{row.reference}</span>
        </>
      ),
    },
    {
      key: "roomNumber",
      header: "Room",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.roomNumber ?? "—"}</span>,
    },
    {
      key: "checkIn",
      header: "Stay",
      sortable: true,
      render: (row) => formatDateRange(row.checkIn, row.checkOut),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      render: (row) => <StatusBadge status={row.paymentStatus} domain="payment" />,
    },
    {
      key: "total",
      header: "Balance",
      align: "right",
      sortable: true,
      render: (row) => (
        <span className="shms-cell-numeric">
          {row.paymentStatus === PAYMENT_STATUS.PAID
            ? "—"
            : formatCurrency(row.total, row.currency)}
        </span>
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
            className="shms-btn shms-btn-primary shms-btn-sm"
            onClick={() => setSettling(row)}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
            Check out
          </button>
        </div>
      ),
    },
  ];

  const owes = settling && settling.paymentStatus !== PAYMENT_STATUS.PAID;

  return (
    <>
      <DataTable
        columns={columns}
        rows={departures}
        rowKey={(row) => row.id}
        isLoading={desk.isLoading}
        error={desk.error}
        onRetry={desk.reload}
        searchPlaceholder="Search guest, reference or room"
        searchKeys={["guestName", "reference", "roomNumber"]}
        caption="Guests departing today"
        emptyState={{
          title: "No departures today",
          message: "Every in-house guest is staying on.",
          icon: "bi-calendar2-check",
        }}
      />

      {settling && (
        <Modal
          title={owes ? "Settle and check out" : "Confirm check-out"}
          subtitle={`${settling.guestName} · Room ${settling.roomNumber ?? "—"}`}
          icon="bi-box-arrow-right"
          tone={owes ? "warning" : "default"}
          dismissible={!isSaving}
          onClose={() => setSettling(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setSettling(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="shms-btn shms-btn-primary"
                onClick={() => handleCheckOut(settling, { takePayment: owes })}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="shms-spinner" aria-hidden="true" />
                    Working&hellip;
                  </>
                ) : owes ? (
                  `Take ${formatCurrency(settling.total, settling.currency)} & check out`
                ) : (
                  "Check out"
                )}
              </button>
            </>
          }
        >
          {owes && (
            <div className="shms-alert" role="alert" style={{ marginBottom: "var(--space-5)" }}>
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span>
                {formatCurrency(settling.total, settling.currency)} is outstanding. Confirming
                takes payment and then checks the guest out.
              </span>
            </div>
          )}

          <dl className="shms-defs">
            <div>
              <dt>Reference</dt>
              <dd>{settling.reference}</dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>{formatDateRange(settling.checkIn, settling.checkOut)}</dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>{settling.nights}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatCurrency(settling.total, settling.currency)}</dd>
            </div>
          </dl>

          <p className="shms-booking-note" style={{ marginTop: "var(--space-5)" }}>
            <i className="bi bi-stars" aria-hidden="true" style={{ color: "var(--navy-600)" }} />
            Room {settling.roomNumber ?? "—"} will be handed to housekeeping for cleaning.
          </p>
        </Modal>
      )}
    </>
  );
}

export default CheckOut;
