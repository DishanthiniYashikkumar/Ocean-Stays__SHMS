import { useId, useRef, useState } from "react";
import {
  email as emailRule,
  maxLength,
  phone as phoneRule,
  required,
  validate,
} from "../../utils/validation";
import "../../styles/booking.css";

/**
 * Step 1 — who the stay is for.
 *
 * Pre-filled from the signed-in account, because by this point the guest has
 * already authenticated. They can still correct it: the person booking is not
 * always the person staying.
 *
 * @param {{
 *   initialValues: object,
 *   onSubmit: (values: object) => void,
 *   onBack: () => void
 * }} props
 */

const RULES = {
  firstName: [required("First name"), maxLength(60, "First name")],
  lastName: [required("Last name"), maxLength(60, "Last name")],
  email: [required("Email address"), emailRule()],
  phone: [required("Phone number"), phoneRule()],
  specialRequests: [maxLength(500, "Special requests")],
};

const FIELD_ORDER = ["firstName", "lastName", "email", "phone"];

function GuestDetailsForm({ initialValues, onSubmit, onBack }) {
  const uid = useId();
  const fieldRefs = useRef({});

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };

    setValues(next);
    if (touched[name]) setErrors(validate(next, RULES));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setErrors(validate(values, RULES));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate(values, RULES);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(Object.keys(RULES).map((field) => [field, true])));

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(values);
  }

  function renderField({ name, label, type = "text", icon, placeholder, autoComplete }) {
    const id = `${uid}-${name}`;
    const message = errorFor(name);

    return (
      <div className="shms-field">
        <label className="shms-label" htmlFor={id}>
          {label}
        </label>

        <div className={`shms-input-shell${message ? " is-invalid" : ""}`}>
          <i className={`bi ${icon} shms-input-icon`} aria-hidden="true" />
          <input
            ref={(node) => {
              fieldRefs.current[name] = node;
            }}
            id={id}
            name={name}
            type={type}
            className="shms-input"
            placeholder={placeholder}
            value={values[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete={autoComplete}
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

  const requestsId = `${uid}-specialRequests`;
  const requestsError = errorFor("specialRequests");

  return (
    <form className="shms-step-panel" onSubmit={handleSubmit} noValidate>
      <h2>Guest details</h2>
      <p className="shms-step-intro">
        We&apos;ll use these to prepare your arrival and to send your confirmation.
      </p>

      <div className="shms-form">
        <div className="shms-auth-row">
          {renderField({
            name: "firstName",
            label: "First name",
            icon: "bi-person",
            placeholder: "Amara",
            autoComplete: "given-name",
          })}
          {renderField({
            name: "lastName",
            label: "Last name",
            icon: "bi-person",
            placeholder: "Perera",
            autoComplete: "family-name",
          })}
        </div>

        {renderField({
          name: "email",
          label: "Email address",
          type: "email",
          icon: "bi-envelope",
          placeholder: "you@example.com",
          autoComplete: "email",
        })}

        {renderField({
          name: "phone",
          label: "Phone number",
          type: "tel",
          icon: "bi-telephone",
          placeholder: "+94 77 123 4567",
          autoComplete: "tel",
        })}

        <div className="shms-field">
          <label className="shms-label" htmlFor={requestsId}>
            Special requests
            <span className="shms-label-optional">optional</span>
          </label>

          <div className={`shms-input-shell${requestsError ? " is-invalid" : ""}`}>
            <textarea
              id={requestsId}
              name="specialRequests"
              className="shms-input shms-input-bare"
              placeholder="Arrival time, dietary needs, a cot, a quiet floor — anything we should prepare for."
              value={values.specialRequests}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(requestsError)}
              aria-describedby={requestsError ? `${requestsId}-error` : `${requestsId}-hint`}
            />
          </div>

          {requestsError ? (
            <p className="shms-field-error" id={`${requestsId}-error`} role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              {requestsError}
            </p>
          ) : (
            <p className="shms-field-hint" id={`${requestsId}-hint`}>
              {values.specialRequests.length} / 500 characters
            </p>
          )}
        </div>
      </div>

      <div className="shms-step-actions">
        <button
          type="button"
          className="shms-btn shms-btn-outline shms-btn-back"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back
        </button>

        <button type="submit" className="shms-submit">
          Continue to summary
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

export default GuestDetailsForm;
