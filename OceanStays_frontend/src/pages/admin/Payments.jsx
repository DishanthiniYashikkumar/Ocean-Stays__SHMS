import Payments from "../reception/Payments";

/**
 * Payment oversight.
 *
 * Same reasoning as Reservations: the reception module already lists every
 * invoice with its status, outstanding balance, line items and summary metrics,
 * and can take payment. Duplicating it would mean two places to fix a rounding
 * bug.
 *
 * Card details are never rendered anywhere in this app — see paymentService.
 */
export default Payments;
