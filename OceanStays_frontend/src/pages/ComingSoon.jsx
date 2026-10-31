import { Link } from "react-router-dom";
import "../styles/layout.css";

/**
 * Stand-in for auth-adjacent screens that aren't built yet (register, forgot
 * password, unauthorized, 404). Built from the shared primitives in base.css
 * rather than borrowing the login page's layout.
 */
function ComingSoon({ title, message, icon = "bi-hourglass-split", tone = "default" }) {
  return (
    <div className="shms-page">
      <main
        id="main-content"
        style={{ display: "grid", placeItems: "center", padding: "var(--space-8)" }}
      >
        <div className="shms-state">
          <span
            className={`shms-state-icon${tone === "danger" ? " shms-state-icon-danger" : ""}`}
            aria-hidden="true"
          >
            <i className={`bi ${icon}`} />
          </span>

          <h1 className="shms-state-title">{title}</h1>
          <p className="shms-state-message">{message}</p>

          <div className="shms-state-actions">
            <Link className="shms-btn shms-btn-primary" to="/login">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
              Go to sign in
            </Link>
            <Link className="shms-btn shms-btn-outline" to="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ComingSoon;
