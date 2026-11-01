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

import { request } from "./apiClient";
import { PAYMENT_STATUS } from "./constants";

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
  return request("/payments/intent", { method: "POST", body: { bookingId, amount, method } });
}

/**
 * Confirms a payment. `providerToken` is the opaque token returned by the
 * payment provider's hosted field — never a card number.
 */
export async function confirmPayment({ intentId, bookingId, providerToken }) {
  return request("/payments/confirm", {
    method: "POST",
    body: { intentId, bookingId, providerToken },
  });
}

/** Payment history for a guest or for the admin payments table. */
export async function getPayments({ guestId, status } = {}) {
  const data = await request("/payments", { params: { guestId, status } });
  return data.payments;
}

export async function getInvoiceById(invoiceId) {
  return request(`/payments/invoices/${invoiceId}`);
}
