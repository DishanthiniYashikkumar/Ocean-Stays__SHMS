/**
 * Shown when a request succeeds but returns nothing. Always offers a way
 * forward rather than leaving the user at a dead end.
 *
 * @param {{
 *   title: string,
 *   message?: string,
 *   icon?: string,
 *   children?: React.ReactNode  Action buttons or links
 * }} props
 */
function EmptyState({ title, message, icon = "bi-inbox", children }) {
  return (
    <div className="shms-state">
      <span className="shms-state-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>

      <h3 className="shms-state-title">{title}</h3>
      {message && <p className="shms-state-message">{message}</p>}

      {children && <div className="shms-state-actions">{children}</div>}
    </div>
  );
}

export default EmptyState;
