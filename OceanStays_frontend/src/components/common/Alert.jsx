/**
 * Inline message inside a form or panel.
 *
 * Errors use role="alert" so they are announced immediately; other tones are
 * a polite status.
 *
 * @param {{
 *   tone?: "danger" | "success" | "warning" | "info",
 *   icon?: string,
 *   className?: string,
 *   style?: import("react").CSSProperties,
 *   children: import("react").ReactNode,
 * }} props
 */
const DEFAULT_ICONS = {
  danger: "bi-exclamation-triangle-fill",
  success: "bi-check-circle-fill",
  warning: "bi-exclamation-circle-fill",
  info: "bi-info-circle-fill",
};

function Alert({ tone = "danger", icon, className = "", style, children }) {
  const toneClass = tone === "danger" ? "" : `shms-alert-${tone}`;

  return (
    <div
      className={["shms-alert", toneClass, className].filter(Boolean).join(" ")}
      role={tone === "danger" ? "alert" : "status"}
      style={style}
    >
      <i className={`bi ${icon ?? DEFAULT_ICONS[tone]}`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default Alert;
