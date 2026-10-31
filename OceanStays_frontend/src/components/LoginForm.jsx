import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { validateCredentials } from "../services/authService";

/**
 * Controlled login form. Owns field state, validation and the submit lifecycle.
 * It does NOT decide where the user goes next -- it hands the authenticated
 * user back to the parent, which resolves the role-based destination.
 *
 * @param {{ onAuthenticated: (user: object) => void }} props
 */
function LoginForm({ onAuthenticated }) {
  const uid = useId();
  const { signIn } = useAuth();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const rememberId = `${uid}-remember`;

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [values, setValues] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A field shows its error only once the user has left it or tried to submit.
  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    const nextValues = { ...values, [name]: nextValue };

    setValues(nextValues);
    setAuthError("");

    // Re-validate live only after the field has already shown an error,
    // so we never nag while someone is still typing for the first time.
    if (touched[name]) {
      setErrors(validateCredentials(nextValues));
    }
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validateCredentials(values));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateCredentials(values);
    setErrors(nextErrors);
    setTouched({ email: true, password: true });
    setAuthError("");

    if (nextErrors.email || nextErrors.password) {
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await signIn({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });
      // The password never leaves this component and is cleared immediately.
      setValues((prev) => ({ ...prev, password: "" }));
      onAuthenticated(user);
    } catch (error) {
      setAuthError(error.message || "We couldn't sign you in. Please try again.");
      passwordRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="shms-form" onSubmit={handleSubmit} noValidate>
      {authError && (
        <div className="shms-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      {/* ---------------------------------------------------------- Email */}
      <div className="shms-field">
        <label className="shms-label" htmlFor={emailId}>
          Email address
        </label>

        <div className={`shms-input-shell${errorFor("email") ? " is-invalid" : ""}`}>
          <i className="bi bi-envelope shms-input-icon" aria-hidden="true" />
          <input
            ref={emailRef}
            id={emailId}
            name="email"
            type="email"
            className="shms-input"
            placeholder="Enter your email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            disabled={isSubmitting}
            aria-invalid={Boolean(errorFor("email"))}
            aria-describedby={errorFor("email") ? `${emailId}-error` : undefined}
          />
        </div>

        {errorFor("email") && (
          <p className="shms-field-error" id={`${emailId}-error`} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {errors.email}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------- Password */}
      <div className="shms-field">
        <label className="shms-label" htmlFor={passwordId}>
          Password
        </label>

        <div className={`shms-input-shell${errorFor("password") ? " is-invalid" : ""}`}>
          <i className="bi bi-lock shms-input-icon" aria-hidden="true" />
          <input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            className="shms-input has-trailing-action"
            placeholder="Enter your password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="current-password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errorFor("password"))}
            aria-describedby={errorFor("password") ? `${passwordId}-error` : undefined}
          />
          <button
            type="button"
            className="shms-password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={passwordId}
            disabled={isSubmitting}
          >
            <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"} aria-hidden="true" />
          </button>
        </div>

        {errorFor("password") && (
          <p className="shms-field-error" id={`${passwordId}-error`} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {errors.password}
          </p>
        )}
      </div>

      {/* ---------------------------------------------- Remember / Forgot */}
      <div className="shms-form-options">
        <div className="shms-checkbox">
          <input
            id={rememberId}
            name="remember"
            type="checkbox"
            checked={values.remember}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <label htmlFor={rememberId}>Remember me</label>
        </div>

        <Link className="shms-link" to="/forgot-password">
          Forgot password?
        </Link>
      </div>

      {/* --------------------------------------------------------- Submit */}
      <button type="submit" className="shms-submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="shms-spinner" aria-hidden="true" />
            Signing in&hellip;
          </>
        ) : (
          <>
            Sign In
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="shms-register">
        Don&apos;t have an account?{" "}
        <Link className="shms-link shms-link-strong" to="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
