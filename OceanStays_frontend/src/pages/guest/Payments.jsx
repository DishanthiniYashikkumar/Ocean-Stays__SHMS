import { useCallback, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { confirmPayment, createPaymentIntent, getPayments } from "../../services/paymentService";
import { formatCurrency, formatDate } from "../../utils/format";
import "../../styles/dashboard.css";

/** Invoices, line items and anything still owed. */
function Payments() {
  const { user } = useAuth();
  const toast = useToast();

  const [openInvoice, setOpenInvoice] = useState(null);
  const [settlingId, setSettlingId] = useState(null);

  const load = useCallback(() => getPayments({ guestId: user.id }), [user.id]);
  const { data: invoices, isLoading, error, isEmpty, reload } = useAsync(load);

  const balanceDue = invoices?.reduce((sum, invoice) => sum + (invoice.balanceDue ?? 0), 0) ?? 0;

  async function handleSettle(invoice) {
    setSettlingId(invoice.id);

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
        `${formatCurrency(invoice.balanceDue, invoice.currency)} paid. Your receipt is on its way.`,
        { title: "Payment received" },
      );
      setOpenInvoice(null);
      reload();
    } catch (payError) {
      toast.error(payError.message || "We couldn't take that payment. Please try again.");
    } finally {
      setSettlingId(null);
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load your bills" message={error.message} onRetry={reload} />;
  }

  return (
    <>
      {/* --------------------------------------------------------- Balance */}
      {!isLoading && !isEmpty && (
        <div className="shms-stats">
          <article className="shms-stat">
            <span
              className={`shms-stat-icon ${balanceDue > 0 ? "shms-stat-icon-warning" : "shms-stat-icon-success"}`}
              aria-hidden="true"
            >
              <i className={`bi ${balanceDue > 0 ? "bi-exclamation-circle" : "bi-check2-circle"}`} />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value">
                {balanceDue > 0 ? formatCurrency(balanceDue) : "Settled"}
              </span>
              <span className="shms-stat-label">
                {balanceDue > 0 ? "Outstanding balance" : "Nothing owed"}
              </span>
            </span>
          </article>

          <article className="shms-stat">
            <span className="shms-stat-icon" aria-hidden="true">
              <i className="bi bi-receipt" />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value">{invoices.length}</span>
              <span className="shms-stat-label">Invoices issued</span>
            </span>
          </article>
        </div>
      )}

      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>Invoices</h2>
            <p>Every charge from every stay</p>
          </div>
        </div>

        {isLoading ? (
          <div className="shms-panel-body">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} style={{ marginBottom: "var(--space-5)" }} aria-hidden="true">
                <div className="shms-skeleton shms-skeleton-title" />
                <div className="shms-skeleton shms-skeleton-text" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState
            title="No invoices yet"
            message="Once you complete a booking, its invoice will appear here."
            icon="bi-receipt"
          />
        ) : (
          <ul className="shms-rows">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <div className="shms-row">
                  <span className="shms-row-icon" aria-hidden="true">
                    <i className="bi bi-receipt" />
                  </span>

                  <div className="shms-row-copy">
                    <p className="shms-row-title">
                      {invoice.reference}
                      <StatusBadge status={invoice.status} domain="payment" />
                    </p>
                    <p className="shms-row-meta">
                      Booking {invoice.bookingReference} · Issued {formatDate(invoice.issuedAt)} ·{" "}
                      {invoice.lines.length} line items
                      {invoice.balanceDue > 0 &&
                        ` · ${formatCurrency(invoice.balanceDue, invoice.currency)} outstanding`}
                    </p>
                  </div>

                  <div className="shms-row-aside">
                    <span className="shms-row-amount">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                    <button
                      type="button"
                      className="shms-btn shms-btn-outline shms-btn-sm"
                      onClick={() => setOpenInvoice(invoice)}
                    >
                      View
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------- Invoice detail */}
      {openInvoice && (
        <Modal
          title={`Invoice ${openInvoice.reference}`}
          subtitle={`Booking ${openInvoice.bookingReference} · issued ${formatDate(openInvoice.issuedAt)}`}
          icon="bi-receipt"
          size="lg"
          dismissible={settlingId === null}
          onClose={() => setOpenInvoice(null)}
          footer={
            openInvoice.balanceDue > 0 ? (
              <>
                <button
                  type="button"
                  className="shms-btn shms-btn-outline"
                  onClick={() => setOpenInvoice(null)}
                  disabled={settlingId !== null}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="shms-btn shms-btn-primary"
                  onClick={() => handleSettle(openInvoice)}
                  disabled={settlingId !== null}
                  aria-busy={settlingId !== null}
                >
                  {settlingId ? (
                    <>
                      <span className="shms-spinner" aria-hidden="true" />
                      Processing&hellip;
                    </>
                  ) : (
                    `Pay ${formatCurrency(openInvoice.balanceDue, openInvoice.currency)}`
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setOpenInvoice(null)}
              >
                Close
              </button>
            )
          }
        >
          <div className="shms-summary-lines" style={{ marginBottom: "var(--space-5)" }}>
            {openInvoice.lines.map((line) => (
              <div className="shms-summary-row" key={line.id}>
                <span>{line.label}</span>
                <span>{formatCurrency(line.amount, openInvoice.currency)}</span>
              </div>
            ))}

            <div className="shms-summary-row shms-summary-total">
              <span>Total</span>
              <span>{formatCurrency(openInvoice.total, openInvoice.currency)}</span>
            </div>

            <div className="shms-summary-row">
              <span>Paid to date</span>
              <span>{formatCurrency(openInvoice.amountPaid, openInvoice.currency)}</span>
            </div>

            {openInvoice.balanceDue > 0 && (
              <div className="shms-summary-row" style={{ fontWeight: 600 }}>
                <span>Balance due</span>
                <span style={{ color: "var(--warning-ink)" }}>
                  {formatCurrency(openInvoice.balanceDue, openInvoice.currency)}
                </span>
              </div>
            )}
          </div>

          <p className="shms-hosted-note">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <span>
              Payment is taken through our provider&apos;s hosted checkout. Card details never
              reach Ocean Stays&apos; servers and are never stored.
            </span>
          </p>
        </Modal>
      )}
    </>
  );
}

export default Payments;
