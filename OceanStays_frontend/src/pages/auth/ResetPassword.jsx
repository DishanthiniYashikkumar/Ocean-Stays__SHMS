import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { resetPassword } from "../../services/authService";
import { matches, minLength, passwordStrength, required, validate } from "../../utils/validation";

/**
 * Completes a password reset. The token arrives as `?token=` on the link the
 * backend emails; without one there is nothing to reset, so the page says so
 * rather than presenting a form that cannot succeed.
 */

const RULES = {
  password: [required("Password"), minLength(8, "Password")],
  confirmPassword: [
    required("Password confirmation"),
    matches("password", "Those passwords don't match."),
  ],
};

function ResetPassword() {
  const uid = useId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isDone, setIsDone] = useState(false);

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);
  const strength = passwordStrength(values.password);

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };

    setValues(next);
    setSubmitError("");
    if (touched[name] || (name === "password" && touched.confirmPassword)) {
      setErrors(validate(next, RULES));
    }
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
    setTouched({ password: true, confirmPassword: true });
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ token, password: values.password });
      setValues({ password: "", confirmPassword: "" });
      setIsDone(true);
    } catch (error) {
      setSubmitError(error.message || "We couldn't reset your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ---- No token: the link is malformed or was typed by hand -------------- */
  if (!token) {
    return (
      <AuthLayout title="This link isn't valid" icon="bi-shield-exclamation">
        <div className="shms-auth-sent">
          <p>
            Password reset links expire after 60 minutes and can only be used once. Request a
            fresh one and we&apos;ll email it straight away.
          </p>

          <div className="shms-auth-sent-actions">
            <Link className="shms-btn shms-btn-primary shms-btn-block" to="/forgot-password">
              Request a new link
            </Link>
            <Link className="shms-btn shms-btn-outline shms-btn-block" to="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  /* ---- Done -------------------------------------------------------------- */
  if (isDone) {
    return (
      <AuthLayout title="Password updated" icon="bi-check2-circle">
        <div className="shms-auth-sent">
          <span className="shms-auth-sent-icon" aria-hidden="true">
            <i className="bi bi-check2-circle" />
          </span>

          <p>
            Your password has been changed. You can sign in with it now — any other devices
            already signed in will need to sign in again.
          </p>

          <div className="shms-auth-sent-actions">
            <button
              type="button"
              className="shms-btn shms-btn-primary shms-btn-block"
              onClick={() => navigate("/login", { replace: true })}
            >
              Continue to sign in
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  /* ---- Form -------------------------------------------------------------- */
  const fields = [
    {
      name: "password",
      label: "New password",
      icon: "bi-lock",
      placeholder: "At least 8 characters",
    },
    {
      name: "confirmPassword",
      label: "Confirm new password",
      icon: "bi-lock-fill",
      placeholder: "Re-enter your new password",
    },
  ];

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you haven't used here before"
      icon="bi-shield-lock"
    >
      <form className="shms-form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="shms-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        {fields.map(({ name, label, icon, placeholder }) => {
          const id = `${uid}-${name}`;
          const message = errorFor(name);

          return (
            <div key={name}>
              <div className="shms-field">
                <label className="shms-label" htmlFor={id}>
                  {label}
                </label>

                <div className={`shms-input-shell${message ? " is-invalid" : ""}`}>
                  <i className={`bi ${icon} shms-input-icon`} aria-hidden="true" />
                  <input
                    id={id}
                    name={name}
                    type={showPassword ? "text" : "password"}
                    className={`shms-input${name === "password" ? " has-trailing-action" : ""}`}
                    placeholder={placeholder}
                    value={values[name]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(message)}
                    aria-describedby={message ? `${id}-error` : undefined}
                  />

                  {name === "password" && (
                    <button
                      type="button"
                      className="shms-password-toggle"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      disabled={isSubmitting}
                    >
                      <i
                        className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>

                {message && (
                  <p className="shms-field-error" id={`${id}-error`} role="alert">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    {message}
                  </p>
                )}
              </div>

              {name === "password" && values.password && !message && (
                <div className="shms-strength">
                  <span className="shms-strength-track" aria-hidden="true">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={`shms-strength-seg${
                          index < strength.score ? ` is-on-${strength.tone}` : ""
                        }`}
                      />
                    ))}
                  </span>
                  <span className={`shms-strength-label is-${strength.tone}`} aria-live="polite">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          className="shms-submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="shms-spinner" aria-hidden="true" />
              Updating&hellip;
            </>
          ) : (
            <>
              Update password
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
