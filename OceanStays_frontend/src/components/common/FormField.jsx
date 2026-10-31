/**
 * One labelled form control with its error and hint.
 *
 * Extracted from the `renderField` helpers that were hand-written in
 * RegisterForm, GuestDetailsForm and guest/Profile — this removes existing
 * duplication rather than adding a layer, and the admin modules all need the
 * same thing.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   label: string,
 *   type?: string,            text | email | tel | number | date | time | select | textarea | checkbox
 *   value: any,
 *   onChange: (event) => void,
 *   onBlur?: (event) => void,
 *   error?: string,
 *   hint?: string,
 *   icon?: string,            Bootstrap Icons class, for text-like inputs
 *   options?: Array<{value, label}>,   Required for type="select"
 *   placeholder?: string,
 *   required?: boolean,
 *   disabled?: boolean,
 *   min?: number|string,
 *   max?: number|string,
 *   maxLength?: number,
 *   autoComplete?: string,
 *   inputRef?: React.Ref
 * }} props
 */
function FormField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  hint,
  icon,
  options = [],
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  maxLength,
  autoComplete,
  inputRef,
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  /* ---- Checkbox sits on its own; it has no shell or icon ---------------- */
  if (type === "checkbox") {
    return (
      <div className="shms-checkbox shms-checkbox-inline">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="checkbox"
          checked={Boolean(value)}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-describedby={describedBy}
        />
        <label htmlFor={id}>
          {label}
          {hint && (
            <>
              <br />
              <span className="shms-cell-muted" id={`${id}-hint`}>
                {hint}
              </span>
            </>
          )}
        </label>
      </div>
    );
  }

  const shellClass = `shms-input-shell${error ? " is-invalid" : ""}`;
  // Only text-like inputs get the leading icon and its extra padding.
  const inputClass = `shms-input${icon && type !== "select" && type !== "textarea" ? "" : " shms-input-bare"}`;

  const shared = {
    ref: inputRef,
    id,
    name,
    value: value ?? "",
    onChange,
    onBlur,
    disabled,
    className: inputClass,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    ...(required ? { required: true } : {}),
  };

  return (
    <div className="shms-field">
      <label className="shms-label" htmlFor={id}>
        {label}
        {!required && <span className="shms-label-optional">optional</span>}
      </label>

      <div className={shellClass}>
        {icon && type !== "select" && type !== "textarea" && (
          <i className={`bi ${icon} shms-input-icon`} aria-hidden="true" />
        )}

        {type === "select" ? (
          <select {...shared}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea {...shared} placeholder={placeholder} maxLength={maxLength} />
        ) : (
          <input
            {...shared}
            type={type}
            placeholder={placeholder}
            min={min}
            max={max}
            maxLength={maxLength}
            autoComplete={autoComplete}
          />
        )}
      </div>

      {error ? (
        <p className="shms-field-error" id={`${id}-error`} role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p className="shms-field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default FormField;
