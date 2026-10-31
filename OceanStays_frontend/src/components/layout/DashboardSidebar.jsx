import { Link, NavLink } from "react-router-dom";
import { getNavForRole } from "./dashboardNav";
import { ROLE_LABELS } from "../../services/authService";
import "../../styles/dashboard.css";

/**
 * Role-driven dashboard navigation.
 *
 * The sections come from dashboardNav.js, so adding a staff dashboard means
 * editing that config rather than this component.
 *
 * Below 900px it becomes a drawer; `isOpen` and `onClose` are ignored above it.
 *
 * @param {{
 *   role: string,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSignOut: () => void
 * }} props
 */
function DashboardSidebar({ role, isOpen, onClose, onSignOut }) {
  const sections = getNavForRole(role);

  return (
    <aside
      id="dashboard-sidebar"
      className={`shms-side${isOpen ? " is-open" : ""}`}
      aria-label="Dashboard navigation"
    >
      <Link className="shms-side-brand" to="/" onClick={onClose}>
        <span className="shms-side-mark" aria-hidden="true">
          <i className="bi bi-water" />
        </span>
        <span className="shms-side-wordmark">
          <span className="shms-side-name">OCEAN STAYS</span>
          <span className="shms-side-role">{ROLE_LABELS[role] ?? "Portal"}</span>
        </span>
      </Link>

      <nav className="shms-side-nav">
        {sections.map(({ legend, items }) => (
          <div className="shms-side-group" key={legend}>
            <span className="shms-side-legend">{legend}</span>

            <ul className="shms-side-list">
              {items.map(({ to, label, icon, end, count }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) => `shms-side-link${isActive ? " is-active" : ""}`}
                  >
                    <i className={`bi ${icon}`} aria-hidden="true" />
                    {label}
                    {count > 0 && <span className="shms-side-count">{count}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shms-side-foot">
        <button type="button" className="shms-side-signout" onClick={onSignOut}>
          <i className="bi bi-box-arrow-left" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
