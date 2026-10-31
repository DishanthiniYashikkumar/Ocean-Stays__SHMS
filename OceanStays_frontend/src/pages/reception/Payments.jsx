import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  PAYMENT_STATUS,
  confirmPayment,
  createPaymentIntent,
  getPayments,
} from "../../services/paymentService";
import { formatCurrency, formatDate } from "../../utils/format";
import "../../styles/dashboard.css";

/** Every invoice, with the ability to take payment at the desk. */

const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: PAYMENT_STATUS.PENDING, label: "Pending" },
  { value: PAYMENT_STATUS.PAID, label: "Paid" },
  { value: PAYMENT_STATUS.REFUNDED, label: "Refunded" },
];

function Payments() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => getPayments(), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    const items = data ?? [];
    return status ? items.filter((invoice) => invoice.status === status) : items;
  }, [data, status]);

  const outstanding = (data ?? []).reduce((sum, invoice) => sum + (invoice.balanceDue ?? 0), 0);

  async function handleSettle(invoice) {
    setIsSaving(true);
    try {
      const intent = await createPaymentIntent({
        bookingId: invoice.bookingId,
        amount: invoice.balanceDue,
        method: "card",
      });
      await confirmPayment({
        intentId: intent.intentId,
        bookingId: invoice.bookingId,
        providerToken: intent.clientSecret,
      });

      toast.success(
        `${formatCurrency(invoice.balanceDue, invoice.currency)} taken against ${invoice.reference}.`,
        { title: "Payment received" },
      );
      setDetail(null);
      reload();
    } catch (payError) {
      toast.error(payError.message || "We couldn't take that payment.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Invoice",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.reference}</span>,
    },
    { key: "guestName", header: "Guest", sortable: true },
    { key: "bookingReference", header: "Booking", sortable: true },
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
        <span
          className="shms-cell-numeric"
          style={row.balanceDue > 0 ? { color: "var(--warning-ink)", fontWeight: 600 } : undefined}
        >
          {row.balanceDue > 0 ? formatCurrency(row.balanceDue, row.currency) : "—"}
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
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => setDetail(row)}
          >
            {row.balanceDue > 0 ? "Take payment" : "View"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="shms-stats">
          <article className="shms-stat">
            <span
              className={`shms-stat-icon ${outstanding > 0 ? "shms-stat-icon-warning" : "shms-stat-icon-success"}`}
              aria-hidden="true"
            >
              <i className={`bi ${outstanding > 0 ? "bi-exclamation-circle" : "bi-check2-circle"}`} />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value">
                {outstanding > 0 ? formatCurrency(outstanding) : "Settled"}
              </span>
              <span className="shms-stat-label">Outstanding across all invoices</span>
            </span>
          </article>

          <article className="shms-stat">
            <span className="shms-stat-icon" aria-hidden="true">
              <i className="bi bi-receipt" />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value">{data.length}</span>
              <span className="shms-stat-label">Invoices issued</span>
            </span>
          </article>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search invoice, guest or booking"
        searchKeys={["reference", "guestName", "bookingReference"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="All invoices"
        emptyState={{
          title: "No invoices",
          message: "Invoices are raised when a booking is created.",
          icon: "bi-receipt",
        }}
      />

      {detail && (
        <Modal
          title={detail.reference}
          subtitle={`${detail.guestName} · booking ${detail.bookingReference}`}
          icon="bi-receipt"
          size="lg"
          dismissible={!isSaving}
          onClose={() => setDetail(null)}
          footer={
            detail.balanceDue > 0 ? (
              <>
                <button
                  type="button"
                  className="shms-btn shms-btn-outline"
                  onClick={() => setDetail(null)}
                  disabled={isSaving}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="shms-btn shms-btn-primary"
                  onClick={() => handleSettle(detail)}
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="shms-spinner" aria-hidden="true" />
                      Processing&hellip;
                    </>
                  ) : (
                    `Take ${formatCurrency(detail.balanceDue, detail.currency)}`
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            )
          }
        >
          <div className="shms-summary-lines">
            {detail.lines.map((line) => (
              <div className="shms-summary-row" key={line.id}>
                <span>{line.label}</span>
                <span>{formatCurrency(line.amount, detail.currency)}</span>
              </div>
            ))}

            <div className="shms-summary-row shms-summary-total">
              <span>Total</span>
              <span>{formatCurrency(detail.total, detail.currency)}</span>
            </div>
            <div className="shms-summary-row">
              <span>Paid to date</span>
              <span>{formatCurrency(detail.amountPaid, detail.currency)}</span>
            </div>
            {detail.balanceDue > 0 && (
              <div className="shms-summary-row" style={{ fontWeight: 600 }}>
                <span>Balance due</span>
                <span style={{ color: "var(--warning-ink)" }}>
                  {formatCurrency(detail.balanceDue, detail.currency)}
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default Payments;
