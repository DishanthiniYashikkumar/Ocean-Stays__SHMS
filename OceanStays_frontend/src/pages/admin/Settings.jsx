import { useCallback, useState } from "react";
import ErrorState from "../../components/common/ErrorState";
import FormField from "../../components/common/FormField";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { getSettings, updateSettings } from "../../services/settingsService";
import { email as emailRule, phone as phoneRule, required, validate } from "../../utils/validation";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

/**
 * System settings.
 *
 * Three sections, each saved independently so a mistake in one does not block
 * the others. Operational values written here are pushed back into
 * BOOKING_POLICY and HOTEL by the service, so a changed cancellation window
 * takes effect across the guest portal immediately rather than only here.
 *
 * Scope is limited to settings this frontend actually honours. Adding switches
 * for things the app cannot do would be worse than not having them.
 */

const HOTEL_RULES = {
  name: [required("Hotel name")],
  email: [required("Email address"), emailRule()],
  phone: [required("Phone number"), phoneRule()],
  addressLine1: [required("Address")],
};

const OPS_RULES = {
  checkInTime: [required("Check-in time")],
  checkOutTime: [required("Check-out time")],
};

const NOTIFICATION_LABELS = {
  bookingConfirmation: ["Booking confirmations", "Emailed as soon as a reservation is made."],
  checkInReminder: ["Check-in reminders", "Sent the day before arrival."],
  checkOutReminder: ["Check-out reminders", "Sent on the morning of departure."],
  paymentReceipts: ["Payment receipts", "Emailed whenever a payment settles."],
  serviceUpdates: ["Service request updates", "Sent when a request changes status."],
  marketingEmails: ["Marketing emails", "Offers and seasonal news. Off by default."],
};

/** One savable section. Keeps its own draft, errors and saving state. */
function SettingsSection({ title, description, initial, rules, onSave, children }) {
  /*
   * Seeded once on mount. Saving triggers a reload in the parent, which shows
   * the skeleton and unmounts this section — so it remounts with the fresh
   * values rather than needing an effect to re-seed itself.
   */
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    const next = { ...values, [name]: type === "checkbox" ? checked : value };
    setValues(next);
    if (errors[name] && rules) setErrors(validate(next, rules));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    if (rules) {
      const nextErrors = validate(values, rules);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
    }

    setIsSaving(true);
    try {
      await onSave(values);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="shms-panel">
      <div className="shms-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="shms-panel-body">
        <form onSubmit={handleSubmit} noValidate>
          {children({ values, errors, handleChange, isSaving })}

          <div className="shms-settings-actions">
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => {
                setValues(initial);
                setErrors({});
              }}
              disabled={!isDirty || isSaving}
            >
              Reset
            </button>
            <button
              type="submit"
              className="shms-btn shms-btn-primary"
              disabled={!isDirty || isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="shms-spinner" aria-hidden="true" />
                  Saving&hellip;
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Settings() {
  const toast = useToast();

  const load = useCallback(() => getSettings(), []);
  const { data, isLoading, error, reload } = useAsync(load);

  async function save(section, values, message) {
    try {
      await updateSettings(section, values);
      toast.success(message, { title: "Settings saved" });
      reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't save those settings.");
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load settings" message={error.message} onRetry={reload} />;
  }

  if (isLoading || !data) {
    return (
      <div className="shms-route-loading">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shms-skeleton" style={{ height: 240 }} aria-hidden="true" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ---------------------------------------------------- Hotel info */}
      <SettingsSection
        title="Hotel information"
        description="Shown across the public site, confirmations and invoices"
        initial={data.hotel}
        rules={HOTEL_RULES}
        onSave={(values) => save("hotel", values, "Hotel details updated everywhere they appear.")}
      >
        {({ values, errors, handleChange, isSaving }) => (
          <>
            <div className="shms-settings-grid">
              <FormField
                id="set-name" name="name" label="Hotel name" icon="bi-buildings"
                value={values.name} onChange={handleChange} error={errors.name}
                required disabled={isSaving}
              />
              <FormField
                id="set-email" name="email" label="Reservations email" type="email" icon="bi-envelope"
                value={values.email} onChange={handleChange} error={errors.email}
                required disabled={isSaving}
              />
              <FormField
                id="set-phone" name="phone" label="Phone" type="tel" icon="bi-telephone"
                value={values.phone} onChange={handleChange} error={errors.phone}
                required disabled={isSaving}
              />
              <FormField
                id="set-addr1" name="addressLine1" label="Address line 1" icon="bi-geo-alt"
                value={values.addressLine1} onChange={handleChange} error={errors.addressLine1}
                required disabled={isSaving}
              />
              <FormField
                id="set-addr2" name="addressLine2" label="Address line 2" icon="bi-geo-alt"
                value={values.addressLine2} onChange={handleChange} disabled={isSaving}
              />
              <FormField
                id="set-country" name="country" label="Country" icon="bi-globe"
                value={values.country} onChange={handleChange} disabled={isSaving}
              />
            </div>

            <div style={{ marginTop: "19px" }}>
              <FormField
                id="set-tagline" name="tagline" label="Tagline" type="textarea" maxLength={120}
                value={values.tagline} onChange={handleChange} disabled={isSaving}
                hint="Appears in the footer and on the login page."
              />
            </div>
          </>
        )}
      </SettingsSection>

      {/* --------------------------------------------------- Operations */}
      <SettingsSection
        title="Operational settings"
        description="Applied to every new and existing booking"
        initial={data.operations}
        rules={OPS_RULES}
        onSave={(values) =>
          save("operations", values, "Policy updated — the guest portal now enforces the new values.")
        }
      >
        {({ values, errors, handleChange, isSaving }) => (
          <div className="shms-settings-grid">
            <FormField
              id="set-checkin" name="checkInTime" label="Check-in from" type="time"
              value={values.checkInTime} onChange={handleChange} error={errors.checkInTime}
              required disabled={isSaving}
            />
            <FormField
              id="set-checkout" name="checkOutTime" label="Check-out by" type="time"
              value={values.checkOutTime} onChange={handleChange} error={errors.checkOutTime}
              required disabled={isSaving}
            />
            <FormField
              id="set-cancel" name="freeCancellationHours" label="Free cancellation (hours)"
              type="number" min={0} max={168}
              value={values.freeCancellationHours} onChange={handleChange}
              required disabled={isSaving}
              hint="Before arrival."
            />
            <FormField
              id="set-modify" name="modificationCutoffHours" label="Modification cutoff (hours)"
              type="number" min={0} max={168}
              value={values.modificationCutoffHours} onChange={handleChange}
              required disabled={isSaving}
            />
            <FormField
              id="set-tax" name="taxRatePercent" label="Tax rate (%)"
              type="number" min={0} max={100}
              value={values.taxRatePercent} onChange={handleChange}
              required disabled={isSaving}
            />
            <FormField
              id="set-service" name="serviceChargePercent" label="Service charge (%)"
              type="number" min={0} max={100}
              value={values.serviceChargePercent} onChange={handleChange}
              required disabled={isSaving}
            />
          </div>
        )}
      </SettingsSection>

      {/* ------------------------------------------------ Notifications */}
      <SettingsSection
        title="Notification preferences"
        description="Which messages Ocean Stays sends guests automatically"
        initial={data.notifications}
        onSave={(values) => save("notifications", values, "Notification preferences updated.")}
      >
        {({ values, handleChange, isSaving }) => (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {Object.entries(NOTIFICATION_LABELS).map(([key, [label, hint]]) => (
              <FormField
                key={key}
                id={`set-${key}`}
                name={key}
                label={label}
                type="checkbox"
                hint={hint}
                value={values[key]}
                onChange={handleChange}
                disabled={isSaving}
              />
            ))}
          </div>
        )}
      </SettingsSection>
    </>
  );
}

export default Settings;
