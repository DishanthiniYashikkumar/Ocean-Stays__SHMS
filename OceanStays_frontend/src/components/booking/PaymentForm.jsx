import { useId, useState } from "react";
import { PAYMENT_METHODS } from "../../services/paymentService";
import { formatCurrency } from "../../utils/format";
import {
  cardNumber as cardNumberRule,
  cvc as cvcRule,
  expiry as expiryRule,
  formatCardNumber,
  formatExpiry,
  required,
  validate,
} from "../../utils/validation";
import "../../styles/booking.css";

/**
 * Step 3 — payment.
 *
 * SECURITY: the card fields below are a visual stand-in. Nothing typed into
 * them is stored in component state beyond this render, put in the booking
 * payload, or sent to our API — `onSubmit` receives only the chosen method.
 * In production this block is replaced by the payment provider's hosted iframe
 * fields, so the card number never touches our origin at all. The validation
 * here only catches typos before the guest hits submit.
 *
 * @param {{
 *   total: number,
 *   currency: string,
 *   isSubmitting: boolean,
 *   error: string,
 *   onSubmit: (payment: { method: string }) => void,
 *   onBack: () => void
 * }} props
 */

const CARD_RULES = {
  cardName: [required("Name on card")],
  cardNumber: [required("Card number"), cardNumberRule()],
  cardExpiry: [required("Expiry date"), expiryRule()],
  cardCvc: [required("Security code"), cvcRule()],
};

const EMPTY_CARD = { cardName: "", cardNumber: "", cardExpiry: "", cardCvc: "" };

function PaymentForm({ total, currency, isSubmitting, error, onSubmit, onBack }) {
  const uid = useId();

  const [method, setMethod] = useState("card");
  const [card, setCard] = useState(EMPTY_CARD);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  function handleCardChange(event) {
    const { name, value } = event.target;

    // Format as the guest types so the field reads the way a card is printed.
    const formatted =
      name === "cardNumber"
        ? formatCardNumber(value)
        : name === "cardExpiry"
          ? formatExpiry(value)
          : name === "cardCvc"
            ? value.replace(/\D/g, "").slice(0, 4)
            : value;

    const next = { ...card, [name]: formatted };
    setCard(next);
    if (touched[name]) setErrors(validate(next, CARD_RULES));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setErrors(validate(card, CARD_RULES));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    if (method === "card") {
      const nextErrors = validate(card, CARD_RULES);
      setErrors(nextErrors);
      setTouched(Object.fromEntries(Object.keys(CARD_RULES).map((f) => [f, true])));
      if (Object.keys(nextErrors).length > 0) return;
    }

    // Only the method leaves this component. Card values stay here and are
    // dropped when the flow unmounts.
    onSubmit({ method });
  }

  function renderCardField({ name, label, placeholder, inputMode, autoComplete, maxLength }) {
    const id = `${uid}-${name}`;
    const message = errorFor(name);

    return (
      <div className="shms-field">
        <label className="shms-label" htmlFor={id}>
          {label}
        </label>

        <div className={`shms-input-shell${message ? " is-invalid" : ""}`}>
          <input
            id={id}
            name={name}
            type="text"
            className="shms-input shms-input-bare"
            placeholder={placeholder}
            value={card[name]}
            onChange={handleCardChange}
            onBlur={handleBlur}
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            disabled={isSubmitting}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? `${id}-error` : undefined}
          />
        </div>

        {message && (
          <p className="shms-field-error" id={`${id}-error`} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="shms-step-panel" onSubmit={handleSubmit} noValidate>
      <h2>Payment</h2>
      <p className="shms-step-intro">
        Choose how you&apos;d like to pay. Your booking is confirmed as soon as this completes.
      </p>

      {error && (
        <div className="shms-alert" role="alert" style={{ marginBottom: "var(--space-5)" }}>
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <fieldset className="shms-methods" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="visually-hidden">Payment method</legend>

        {PAYMENT_METHODS.map(({ id, label, icon }) => (
          <label
            key={id}
            className={`shms-method${method === id ? " is-selected" : ""}`}
            htmlFor={`${uid}-method-${id}`}
          >
            <input
              id={`${uid}-method-${id}`}
              type="radio"
              name="method"
              value={id}
              checked={method === id}
              onChange={() => setMethod(id)}
              disabled={isSubmitting}
            />
            <i className={`bi ${icon}`} aria-hidden="true" />
            <span className="shms-method-copy">
              <strong>{label}</strong>
              <span>
                {id === "card" && "Visa, Mastercard and Amex accepted"}
                {id === "bank" && "We'll email transfer details — hold expires in 24 hours"}
                {id === "onArrival" && "Settle at the front desk when you check in"}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {method === "card" && (
        <div className="shms-card-fields">
          <p className="shms-hosted-note">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <span>
              Demonstration fields. In production these are replaced by the payment
              provider&apos;s hosted inputs — card details never reach Ocean Stays&apos; servers
              and are never stored.
            </span>
          </p>

          {renderCardField({
            name: "cardName",
            label: "Name on card",
            placeholder: "AMARA PERERA",
            autoComplete: "cc-name",
          })}

          {renderCardField({
            name: "cardNumber",
            label: "Card number",
            placeholder: "4242 4242 4242 4242",
            inputMode: "numeric",
            autoComplete: "cc-number",
            maxLength: 24,
          })}

          <div className="shms-card-row">
            {renderCardField({
              name: "cardExpiry",
              label: "Expiry date",
              placeholder: "MM/YY",
              inputMode: "numeric",
              autoComplete: "cc-exp",
              maxLength: 5,
            })}
            {renderCardField({
              name: "cardCvc",
              label: "Security code",
              placeholder: "123",
              inputMode: "numeric",
              autoComplete: "cc-csc",
              maxLength: 4,
            })}
          </div>
        </div>
      )}

      <div className="shms-step-actions">
        <button
          type="button"
          className="shms-btn shms-btn-outline shms-btn-back"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back
        </button>

        <button
          type="submit"
          className="shms-submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="shms-spinner" aria-hidden="true" />
              Confirming your booking&hellip;
            </>
          ) : (
            <>
              {method === "onArrival" ? "Confirm booking" : `Pay ${formatCurrency(total, currency)}`}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default PaymentForm;
