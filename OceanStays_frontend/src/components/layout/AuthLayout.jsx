import { Link } from "react-router-dom";
import "../../styles/login.css";
import "../../styles/auth.css";

/**
 * Split-screen shell shared by Login, Register, Forgot password and Reset
 * password: branded imagery on the left, a card on the right.
 *
 * Extracted from the original login page without changing its markup or
 * classes, so that page renders exactly as before.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   icon?: string,          Bootstrap Icons class for the card badge
 *   wide?: boolean,         Wider card, for the register form's two-column row
 *   children: React.ReactNode,
 *   footer?: React.ReactNode,   Rendered inside the card
 *   aside?: React.ReactNode     Rendered below the card
 * }} props
 */

const CAPABILITIES = [
  { icon: "bi-calendar2-check", label: "Reservations" },
  { icon: "bi-key", label: "Front Desk" },
  { icon: "bi-stars", label: "Guest Services" },
];

function AuthLayout({
  title,
  subtitle,
  icon = "bi-water",
  wide = false,
  children,
  footer,
  aside,
}) {
  return (
    <div className="shms-login">
      {/* ===================================================== LEFT: VISUAL */}
      <section className="shms-visual" aria-labelledby="shms-visual-title">
        <div className="shms-visual-media" aria-hidden="true" />
        <div className="shms-visual-overlay" aria-hidden="true" />

        <div className="shms-visual-inner">
          <Link className="shms-brand" to="/">
            <span className="shms-brand-mark">
              <i className="bi bi-water" aria-hidden="true" />
            </span>
            <span className="shms-brand-name">OCEAN STAYS</span>
          </Link>

          <div className="shms-visual-copy">
            <h1 className="shms-visual-title" id="shms-visual-title">
              Where the Ocean Meets
              <br />
              Exceptional Hospitality.
            </h1>
            <span className="shms-rule" />
            <p className="shms-tagline">Luxury coastal stays, intelligently managed.</p>
            <p className="shms-visual-note">
              Experience effortless stays, thoughtful service, and smart hospitality at Ocean
              Stays.
            </p>
          </div>

          <ul className="shms-capabilities">
            {CAPABILITIES.map((capability) => (
              <li key={capability.label} className="shms-capability">
                <i className={`bi ${capability.icon}`} aria-hidden="true" />
                {capability.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================================================= RIGHT: CARD */}
      <main className="shms-auth-panel">
        <div className={`shms-auth-card${wide ? " shms-auth-card-wide" : ""}`}>
          <span className="shms-auth-badge">
            <i className={`bi ${icon}`} aria-hidden="true" />
          </span>

          <h2 className="shms-auth-title">{title}</h2>
          {subtitle && <p className="shms-auth-subtitle">{subtitle}</p>}

          {children}

          {footer}
        </div>

        {aside}

        <Link className="shms-auth-back" to="/">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back to Ocean Stays
        </Link>
      </main>
    </div>
  );
}

export default AuthLayout;
