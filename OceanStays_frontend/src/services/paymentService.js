/**
 * paymentService.js
 * -----------------------------------------------------------------------------
 * Payment intent creation and status.
 *
 * SECURITY NOTE FOR THE BACKEND TEAM:
 * This layer never sees, stores or transmits raw card details. In production the
 * card form must be a hosted field / iframe from the payment provider (Stripe
 * Elements, PayHere, etc.) so the PAN never touches our origin. The functions
 * below deliberately accept only a provider token, never a card number.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { BOOKING_STATUS, PAYMENT_STATUS, bookings, invoices } from "./mock/bookings";

export { PAYMENT_STATUS };

export const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit Card", icon: "bi-credit-card-2-front" },
  { id: "bank", label: "Bank Transfer", icon: "bi-bank" },
  { id: "onArrival", label: "Pay on Arrival", icon: "bi-cash-coin" },
];

/**
 * Creates a payment intent for a booking. The returned clientSecret is what a
 * hosted card field would consume.
 *
 * @param {{bookingId: string, amount: number, method: string}} payload
 */
export async function createPaymentIntent({ bookingId, amount, method }) {
  if (!USE_MOCK_API) {
    return request("/payments/intent", { method: "POST", body: { bookingId, amount, method } });
  }

  await delay(600);
  return {
    intentId: `pi-${Date.now()}`,
    bookingId,
    amount,
    method,
    clientSecret: "mock_client_secret_do_not_use_in_production",
    status: PAYMENT_STATUS.PENDING,
  };
}

/**
 * Confirms a payment. `providerToken` is the opaque token returned by the
 * payment provider's hosted field — never a card number.
 */
export async function confirmPayment({ intentId, bookingId, providerToken }) {
  if (!USE_MOCK_API) {
    return request("/payments/confirm", {
      method: "POST",
      body: { intentId, bookingId, providerToken },
    });
  }

  await delay(1400);

  const booking = bookings.find((b) => b.id === bookingId);
  if (booking) {
    booking.paymentStatus = PAYMENT_STATUS.PAID;
    // Settling payment confirms the reservation — a booking left PENDING after
    // a successful charge would show the guest "Paid" beside "Pending". The
    // backend owns this transition; the mock mirrors it so the UI is honest.
    if (booking.status === BOOKING_STATUS.PENDING) {
      booking.status = BOOKING_STATUS.CONFIRMED;
    }
  }

  // Clear the invoice too. Without this the bill still reads "outstanding"
  // after the guest has just been told the payment went through.
  const invoice = invoices.find((item) => item.bookingId === bookingId);
  if (invoice) {
    invoice.amountPaid = invoice.total;
    invoice.balanceDue = 0;
    invoice.status = PAYMENT_STATUS.PAID;
  }

  return {
    intentId,
    bookingId,
    status: PAYMENT_STATUS.PAID,
    receiptReference: `RCP-${Math.floor(100_000 + Math.random() * 899_999)}`,
    paidAt: new Date().toISOString(),
    // The updated records, so callers don't hold a stale copy.
    booking: booking ? clone(booking) : null,
    invoice: invoice ? clone(invoice) : null,
  };
}

/** Payment history for a guest or for the admin payments table. */
export async function getPayments({ guestId, status } = {}) {
  if (!USE_MOCK_API) return request("/payments", { params: { guestId, status } });

  await delay();
  return clone(
    invoices
      .filter((invoice) => {
        if (status && invoice.status !== status) return false;
        if (guestId) {
          const booking = bookings.find((b) => b.id === invoice.bookingId);
          if (booking?.guestId !== guestId) return false;
        }
        return true;
      })
      .map((invoice) => {
        const booking = bookings.find((b) => b.id === invoice.bookingId);
        return {
          ...invoice,
          bookingReference: booking?.reference ?? "—",
          guestName: booking?.guestName ?? "—",
        };
      }),
  );
}

export async function getInvoiceById(invoiceId) {
  if (!USE_MOCK_API) return request(`/payments/invoices/${invoiceId}`);

  await delay();
  const invoice = invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("We couldn't find that invoice.");
  return clone(invoice);
}
