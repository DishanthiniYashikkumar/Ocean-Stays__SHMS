import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  checked,
  email as emailRule,
  matches,
  maxLength,
  minLength,
  passwordStrength,
  phone as phoneRule,
  required,
  validate,
} from "../utils/validation";

/**
 * Guest registration form. Mirrors LoginForm's lifecycle — a field shows its
 * error only once the user has left it or tried to submit — and hands the new
 * user back to the parent, which decides where they go next.
 *
 * Self-registration only ever creates a GUEST. Staff accounts come from an
 * administrator, and the backend must enforce that regardless of what is sent.
 *
 * @param {{ onRegistered: (user: object) => void }} props
 */

const RULES = {
  firstName: [required("First name"), maxLength(60, "First name")],
  lastName: [required("Last name"), maxLength(60, "Last name")],
  email: [required("Email address"), emailRule()],
  phone: [required("Phone number"), phoneRule()],
  password: [required("Password"), minLength(8, "Password")],
  confirmPassword: [
    required("Password confirmation"),
    matches("password", "Those passwords don't match."),
  ],
  acceptedTerms: [checked("Please accept the terms to continue.")],
};

const FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "acceptedTerms",
];

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
};

function RegisterForm({ onRegistered }) {
  const uid = useId();
  const { signUp } = useAuth();

  const fieldRefs = useRef({});

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);
  const strength = passwordStrength(values.password);

  function handleChange(event) {
    const { name, type, value, checked: isChecked } = event.target;
    const next = { ...values, [name]: type === "checkbox" ? isChecked : value };

    setValues(next);
    setAuthError("");

    if (touched[name]) setErrors(validate(next, RULES));
    // Re-check the confirmation as soon as the password changes under it.
    if (name === "password" && touched.confirmPassword) {
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
    setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));
    setAuthError("");

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      // Passwords never leave this component and are cleared immediately.
      setValues((previous) => ({ ...previous, password: "", confirmPassword: "" }));
      onRegistered(user);
    } catch (error) {
      setAuthError(error.message || "We couldn't create your account. Please try again.");
      fieldRefs.current.email?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Renders one text field — the register form has six of them. */
  function renderField({ name, label, type = "text", icon, placeholder, autoComplete, extra }) {
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
            className={`shms-input${extra ? " has-trailing-action" : ""}`}
            placeholder={placeholder}
            value={values[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete={autoComplete}
            autoCapitalize={type === "email" ? "none" : undefined}
            spellCheck={type === "email" ? "false" : undefined}
            disabled={isSubmitting}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? `${id}-error` : undefined}
          />
          {extra}
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

  const passwordToggle = (
    <button
      type="button"
      className="shms-password-toggle"
      onClick={() => setShowPassword((visible) => !visible)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      aria-pressed={showPassword}
      disabled={isSubmitting}
    >
      <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"} aria-hidden="true" />
    </button>
  );

  return (
    <form className="shms-form" onSubmit={handleSubmit} noValidate>
      {authError && (
        <div className="shms-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

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

      {/* ------------------------------------------------------- Password */}
      <div>
        {renderField({
          name: "password",
          label: "Password",
          type: showPassword ? "text" : "password",
          icon: "bi-lock",
          placeholder: "At least 8 characters",
          autoComplete: "new-password",
          extra: passwordToggle,
        })}

        {values.password && !errorFor("password") && (
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

      {renderField({
        name: "confirmPassword",
        label: "Confirm password",
        type: showPassword ? "text" : "password",
        icon: "bi-lock-fill",
        placeholder: "Re-enter your password",
        autoComplete: "new-password",
      })}

      {/* ---------------------------------------------------------- Terms */}
      <div className="shms-checkbox shms-checkbox-inline shms-consent">
        <input
          ref={(node) => {
            fieldRefs.current.acceptedTerms = node;
          }}
          id={`${uid}-terms`}
          name="acceptedTerms"
          type="checkbox"
          checked={values.acceptedTerms}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          aria-invalid={Boolean(errorFor("acceptedTerms"))}
          aria-describedby={errorFor("acceptedTerms") ? `${uid}-terms-error` : undefined}
        />
        <label htmlFor={`${uid}-terms`}>
          I agree to the{" "}
          <Link className="shms-link" to="/contact">
            terms of service
          </Link>{" "}
          and{" "}
          <Link className="shms-link" to="/contact">
            privacy policy
          </Link>
          .
        </label>
      </div>

      {errorFor("acceptedTerms") && (
        <p className="shms-field-error" id={`${uid}-terms-error`} role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {errors.acceptedTerms}
        </p>
      )}

      <button
        type="submit"
        className="shms-submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="shms-spinner" aria-hidden="true" />
            Creating account&hellip;
          </>
        ) : (
          <>
            Create Account
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="shms-register">
        Already have an account?{" "}
        <Link className="shms-link shms-link-strong" to="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
