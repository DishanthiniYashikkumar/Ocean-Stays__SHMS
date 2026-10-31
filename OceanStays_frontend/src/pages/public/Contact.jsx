import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { HOTEL, submitContactMessage } from "../../services/contentService";
import { email, maxLength, minLength, required, validate } from "../../utils/validation";
import "../../styles/contact.css";

/**
 * Contact page: hotel details, a validated message form, and a map.
 *
 * The form mirrors LoginForm's lifecycle — a field shows its error only once
 * the user has left it or tried to submit, so nobody is nagged mid-typing.
 */

const RULES = {
  name: [required("Your name"), maxLength(80, "Your name")],
  email: [required("Email address"), email()],
  subject: [required("Subject"), maxLength(120, "Subject")],
  message: [required("Message"), minLength(20, "Message"), maxLength(2000, "Message")],
};

const EMPTY = { name: "", email: "", subject: "", message: "" };

function Contact() {
  const uid = useId();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reference, setReference] = useState("");

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };

    setValues(next);
    setSubmitError("");
    if (touched[name]) setErrors(validate(next, RULES));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setErrors(validate(values, RULES));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(values, RULES);
    setErrors(nextErrors);
    setTouched({ name: true, email: true, subject: true, message: true });
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`${uid}-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitContactMessage(values);
      setReference(result.reference);
      setValues(EMPTY);
      setTouched({});
    } catch (error) {
      setSubmitError(error.message || "We couldn't send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(HOTEL.mapQuery)}&output=embed`;

  return (
    <>
      <header className="shms-page-head">
        <div className="shms-container">
          <ul className="shms-breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Contact</li>
          </ul>

          <h1>Contact Us</h1>
          <span className="shms-rule-gold" />
          <p>
            Our reservations team answers every message within a few hours, and the front desk
            is staffed around the clock.
          </p>
        </div>
      </header>

      <section className="shms-section">
        <div className="shms-container">
          <div className="shms-contact-layout">
            {/* --------------------------------------------- Detail cards */}
            <div>
              <div className="shms-contact-cards">
                <article className="shms-contact-card">
                  <span className="shms-contact-icon" aria-hidden="true">
                    <i className="bi bi-geo-alt" />
                  </span>
                  <div>
                    <h2>Visit us</h2>
                    <p>
                      {HOTEL.address.line1}
                      <br />
                      {HOTEL.address.line2}
                      <br />
                      {HOTEL.address.country}
                    </p>
                  </div>
                </article>

                <article className="shms-contact-card">
                  <span className="shms-contact-icon" aria-hidden="true">
                    <i className="bi bi-telephone" />
                  </span>
                  <div>
                    <h2>Call reservations</h2>
                    <a href={`tel:${HOTEL.phone.replace(/\s/g, "")}`}>{HOTEL.phone}</a>
                    <p style={{ color: "var(--muted)", fontSize: "var(--text-xs)" }}>
                      Available 24 hours
                    </p>
                  </div>
                </article>

                <article className="shms-contact-card">
                  <span className="shms-contact-icon" aria-hidden="true">
                    <i className="bi bi-envelope" />
                  </span>
                  <div>
                    <h2>Email us</h2>
                    <a href={`mailto:${HOTEL.email}`}>{HOTEL.email}</a>
                    <p style={{ color: "var(--muted)", fontSize: "var(--text-xs)" }}>
                      Replies within a few hours
                    </p>
                  </div>
                </article>

                <article className="shms-contact-card">
                  <span className="shms-contact-icon" aria-hidden="true">
                    <i className="bi bi-clock-history" />
                  </span>
                  <div>
                    <h2>Check-in &amp; check-out</h2>
                    <p>
                      Arrive from {HOTEL.checkInTime}, depart by {HOTEL.checkOutTime}. Early and
                      late arrangements on request.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            {/* ---------------------------------------------------- Form */}
            <div className="shms-contact-form">
              {reference ? (
                <div className="shms-state" style={{ padding: "var(--space-8) 0" }}>
                  <span className="shms-state-icon" aria-hidden="true">
                    <i className="bi bi-check2-circle" />
                  </span>
                  <h2 className="shms-state-title">Message sent</h2>
                  <p className="shms-state-message">
                    Thank you — our reservations team will reply shortly. Your reference is{" "}
                    <strong>{reference}</strong>.
                  </p>
                  <div className="shms-state-actions">
                    <button
                      type="button"
                      className="shms-btn shms-btn-outline"
                      onClick={() => setReference("")}
                    >
                      Send another message
                    </button>
                    <Link className="shms-btn shms-btn-primary" to="/rooms">
                      Explore rooms
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <h2>Send us a message</h2>
                  <p>We reply to every enquiry — usually within a few hours.</p>

                  <form className="shms-form" onSubmit={handleSubmit} noValidate>
                    {submitError && (
                      <div className="shms-alert" role="alert">
                        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="shms-field-row">
                      <div className="shms-field">
                        <label className="shms-label" htmlFor={`${uid}-name`}>
                          Your name
                        </label>
                        <div
                          className={`shms-input-shell${errorFor("name") ? " is-invalid" : ""}`}
                        >
                          <i className="bi bi-person shms-input-icon" aria-hidden="true" />
                          <input
                            id={`${uid}-name`}
                            name="name"
                            type="text"
                            className="shms-input"
                            placeholder="Amara Perera"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="name"
                            disabled={isSubmitting}
                            aria-invalid={Boolean(errorFor("name"))}
                            aria-describedby={errorFor("name") ? `${uid}-name-error` : undefined}
                          />
                        </div>
                        {errorFor("name") && (
                          <p className="shms-field-error" id={`${uid}-name-error`} role="alert">
                            <i className="bi bi-exclamation-circle" aria-hidden="true" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div className="shms-field">
                        <label className="shms-label" htmlFor={`${uid}-email`}>
                          Email address
                        </label>
                        <div
                          className={`shms-input-shell${errorFor("email") ? " is-invalid" : ""}`}
                        >
                          <i className="bi bi-envelope shms-input-icon" aria-hidden="true" />
                          <input
                            id={`${uid}-email`}
                            name="email"
                            type="email"
                            className="shms-input"
                            placeholder="you@example.com"
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="email"
                            spellCheck="false"
                            disabled={isSubmitting}
                            aria-invalid={Boolean(errorFor("email"))}
                            aria-describedby={
                              errorFor("email") ? `${uid}-email-error` : undefined
                            }
                          />
                        </div>
                        {errorFor("email") && (
                          <p className="shms-field-error" id={`${uid}-email-error`} role="alert">
                            <i className="bi bi-exclamation-circle" aria-hidden="true" />
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shms-field">
                      <label className="shms-label" htmlFor={`${uid}-subject`}>
                        Subject
                      </label>
                      <div
                        className={`shms-input-shell${errorFor("subject") ? " is-invalid" : ""}`}
                      >
                        <i className="bi bi-tag shms-input-icon" aria-hidden="true" />
                        <input
                          id={`${uid}-subject`}
                          name="subject"
                          type="text"
                          className="shms-input"
                          placeholder="Booking enquiry"
                          value={values.subject}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(errorFor("subject"))}
                          aria-describedby={
                            errorFor("subject") ? `${uid}-subject-error` : undefined
                          }
                        />
                      </div>
                      {errorFor("subject") && (
                        <p className="shms-field-error" id={`${uid}-subject-error`} role="alert">
                          <i className="bi bi-exclamation-circle" aria-hidden="true" />
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    <div className="shms-field">
                      <label className="shms-label" htmlFor={`${uid}-message`}>
                        Message
                      </label>
                      <div
                        className={`shms-input-shell${errorFor("message") ? " is-invalid" : ""}`}
                      >
                        <textarea
                          id={`${uid}-message`}
                          name="message"
                          className="shms-input shms-input-bare"
                          placeholder="Tell us about your travel dates, party size, and anything we should prepare for."
                          value={values.message}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(errorFor("message"))}
                          aria-describedby={
                            errorFor("message") ? `${uid}-message-error` : `${uid}-message-hint`
                          }
                        />
                      </div>
                      {errorFor("message") ? (
                        <p className="shms-field-error" id={`${uid}-message-error`} role="alert">
                          <i className="bi bi-exclamation-circle" aria-hidden="true" />
                          {errors.message}
                        </p>
                      ) : (
                        <p className="shms-field-hint" id={`${uid}-message-hint`}>
                          {values.message.length} / 2000 characters
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="shms-submit"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="shms-spinner" aria-hidden="true" />
                          Sending&hellip;
                        </>
                      ) : (
                        <>
                          Send message
                          <i className="bi bi-arrow-right" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="shms-contact-map">
            <iframe
              title={`Map showing the location of ${HOTEL.name}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </>
  );
}

export default Contact;
