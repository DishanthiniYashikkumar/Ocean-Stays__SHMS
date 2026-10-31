import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { requestPasswordReset } from "../../services/authService";
import { email as emailRule, required, validate } from "../../utils/validation";

/**
 * Requests a password reset link.
 *
 * The confirmation is identical whether or not the address has an account —
 * telling the visitor "no such user" would let anyone enumerate our user list.
 */

const RULES = { email: [required("Email address"), emailRule()] };

function ForgotPassword() {
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSent, setIsSent] = useState(false);

  const fieldError = touched ? errors.email : undefined;

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate({ email: address }, RULES);
    setErrors(nextErrors);
    setTouched(true);
    setSubmitError("");

    if (nextErrors.email) return;

    setIsSubmitting(true);
    try {
      await requestPasswordReset(address);
      setIsSent(true);
    } catch (error) {
      setSubmitError(error.message || "We couldn't send that email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AuthLayout title="Check your inbox" icon="bi-envelope-check">
        <div className="shms-auth-sent">
          <span className="shms-auth-sent-icon" aria-hidden="true">
            <i className="bi bi-envelope-check" />
          </span>

          <p>
            If an account exists for <strong>{address.trim().toLowerCase()}</strong>, we&apos;ve
            sent a link to reset your password. It expires in 60 minutes.
          </p>

          <div className="shms-auth-sent-actions">
            <Link className="shms-btn shms-btn-primary shms-btn-block" to="/login">
              Back to sign in
            </Link>
            <button
              type="button"
              className="shms-btn shms-btn-outline shms-btn-block"
              onClick={() => setIsSent(false)}
            >
              Use a different email
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link"
      icon="bi-envelope-arrow-up"
    >
      <form className="shms-form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="shms-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="shms-field">
          <label className="shms-label" htmlFor="forgot-email">
            Email address
          </label>

          <div className={`shms-input-shell${fieldError ? " is-invalid" : ""}`}>
            <i className="bi bi-envelope shms-input-icon" aria-hidden="true" />
            <input
              id="forgot-email"
              name="email"
              type="email"
              className="shms-input"
              placeholder="Enter your email"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setSubmitError("");
                if (touched) setErrors(validate({ email: event.target.value }, RULES));
              }}
              onBlur={() => {
                setTouched(true);
                setErrors(validate({ email: address }, RULES));
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "forgot-email-error" : undefined}
            />
          </div>

          {fieldError && (
            <p className="shms-field-error" id="forgot-email-error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              {fieldError}
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
              Sending link&hellip;
            </>
          ) : (
            <>
              Send reset link
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="shms-register">
          Remembered it?{" "}
          <Link className="shms-link shms-link-strong" to="/login">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
