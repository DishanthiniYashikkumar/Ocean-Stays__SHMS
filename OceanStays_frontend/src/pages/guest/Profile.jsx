import { useCallback, useState } from "react";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { ROLE_LABELS } from "../../services/authService";
import { getUserById, updateProfile } from "../../services/userService";
import { formatDate } from "../../utils/format";
import {
  email as emailRule,
  maxLength,
  phone as phoneRule,
  required,
  validate,
} from "../../utils/validation";
import "../../styles/dashboard.css";

/**
 * Account details.
 *
 * Loads the full record from userService rather than trusting the session
 * copy — the stored session carries only what login returned.
 */

const RULES = {
  firstName: [required("First name"), maxLength(60, "First name")],
  lastName: [required("Last name"), maxLength(60, "Last name")],
  email: [required("Email address"), emailRule()],
  phone: [required("Phone number"), phoneRule()],
};

function Profile() {
  const { user } = useAuth();
  const toast = useToast();

  const load = useCallback(() => getUserById(user.id), [user.id]);
  const { data: account, isLoading, error, reload } = useAsync(load);

  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Seed the form the first time the record lands.
  const form = values ?? {
    firstName: account?.firstName ?? "",
    lastName: account?.lastName ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
  };

  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setValues(next);
    if (touched[name]) setErrors(validate(next, RULES));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setErrors(validate(form, RULES));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors = validate(form, RULES);
    setErrors(nextErrors);
    setTouched({ firstName: true, lastName: true, email: true, phone: true });
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await updateProfile(user.id, form);
      toast.success("Your details have been updated.", { title: "Profile saved" });
      setValues(null); // fall back to the freshly-reloaded record
      reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't save those changes.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="shms-panel">
        <div className="shms-panel-body" aria-hidden="true">
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
          <div className="shms-skeleton shms-skeleton-text" style={{ width: "70%" }} />
        </div>
      </section>
    );
  }

  if (error) {
    return <ErrorState title="We couldn't load your profile" message={error.message} onRetry={reload} />;
  }

  function renderField({ name, label, type = "text", icon, placeholder, autoComplete }) {
    const message = errorFor(name);

    return (
      <div className="shms-field">
        <label className="shms-label" htmlFor={`profile-${name}`}>
          {label}
        </label>
        <div className={`shms-input-shell${message ? " is-invalid" : ""}`}>
          <i className={`bi ${icon} shms-input-icon`} aria-hidden="true" />
          <input
            id={`profile-${name}`}
            name={name}
            type={type}
            className="shms-input"
            placeholder={placeholder}
            value={form[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete={autoComplete}
            disabled={isSaving}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? `profile-${name}-error` : undefined}
          />
        </div>
        {message && (
          <p className="shms-field-error" id={`profile-${name}-error`} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ------------------------------------------------------ Account */}
      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>Account</h2>
            <p>Read-only — contact us if any of this is wrong</p>
          </div>
          <StatusBadge status={account.status} domain="user" />
        </div>

        <div className="shms-panel-body">
          <dl className="shms-defs">
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABELS[account.role] ?? account.role}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(account.createdAt)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDate(account.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd>{account.id}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- Details */}
      <section className="shms-panel" style={{ maxWidth: 720 }}>
        <div className="shms-panel-head">
          <div>
            <h2>Your details</h2>
            <p>We use these to prepare your arrival and send confirmations</p>
          </div>
        </div>

        <div className="shms-panel-body">
          <form className="shms-form" onSubmit={handleSubmit} noValidate>
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

            <button type="submit" className="shms-submit" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? (
                <>
                  <span className="shms-spinner" aria-hidden="true" />
                  Saving&hellip;
                </>
              ) : (
                <>
                  Save changes
                  <i className="bi bi-check-lg" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------ Security */}
      <section className="shms-panel" style={{ maxWidth: 720 }}>
        <div className="shms-panel-head">
          <div>
            <h2>Security</h2>
            <p>Changing your password signs you out of other devices</p>
          </div>
        </div>

        <div className="shms-panel-body">
          <a className="shms-btn shms-btn-outline" href="/forgot-password">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            Change password
          </a>
        </div>
      </section>
    </>
  );
}

export default Profile;
