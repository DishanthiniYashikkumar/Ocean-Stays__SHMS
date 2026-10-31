import { Link } from "react-router-dom";
import { HOTEL } from "../../services/contentService";
import "../../styles/footer.css";

/**
 * Public site footer. Contact details and social links come from the hotel
 * content fixture so there is one place to change them.
 */

const EXPLORE_LINKS = [
  { to: "/rooms", label: "Rooms & Suites" },
  { to: "/facilities", label: "Facilities" },
  { to: "/activities", label: "Experiences" },
  { to: "/gallery", label: "Gallery" },
  { to: "/testimonials", label: "Guest Stories" },
];

const GUEST_LINKS = [
  { to: "/login", label: "Sign In" },
  { to: "/register", label: "Create Account" },
  { to: "/rooms", label: "Book Your Stay" },
  { to: "/contact", label: "Contact Us" },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="shms-footer">
      <div className="shms-container">
        <div className="shms-footer-grid">
          {/* ------------------------------------------------------- Brand */}
          <div className="shms-footer-col-brand">
            <Link className="shms-footer-brand" to="/">
              <span className="shms-footer-mark" aria-hidden="true">
                <i className="bi bi-water" />
              </span>
              <span className="shms-footer-name">OCEAN STAYS</span>
            </Link>

            <p className="shms-footer-quote">&ldquo;{HOTEL.tagline}&rdquo;</p>

            <p className="shms-footer-blurb">{HOTEL.intro}</p>

            <ul className="shms-footer-social">
              {HOTEL.social.map(({ id, label, icon, href }) => (
                <li key={id}>
                  <a href={href} aria-label={label}>
                    <i className={`bi ${icon}`} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ----------------------------------------------------- Explore */}
          <div>
            <h2 className="shms-footer-title">Explore</h2>
            <ul className="shms-footer-list">
              {EXPLORE_LINKS.map(({ to, label }) => (
                <li key={to + label}>
                  <Link className="shms-footer-link" to={to}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------- Guest */}
          <div>
            <h2 className="shms-footer-title">Your Stay</h2>
            <ul className="shms-footer-list">
              {GUEST_LINKS.map(({ to, label }) => (
                <li key={to + label}>
                  <Link className="shms-footer-link" to={to}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ----------------------------------------------------- Contact */}
          <div>
            <h2 className="shms-footer-title">Get in Touch</h2>
            <ul className="shms-footer-contact">
              <li>
                <i className="bi bi-geo-alt" aria-hidden="true" />
                <span>
                  {HOTEL.address.line1}
                  <br />
                  {HOTEL.address.line2}
                  <br />
                  {HOTEL.address.country}
                </span>
              </li>
              <li>
                <i className="bi bi-telephone" aria-hidden="true" />
                <a href={`tel:${HOTEL.phone.replace(/\s/g, "")}`}>{HOTEL.phone}</a>
              </li>
              <li>
                <i className="bi bi-envelope" aria-hidden="true" />
                <a href={`mailto:${HOTEL.email}`}>{HOTEL.email}</a>
              </li>
              <li>
                <i className="bi bi-clock" aria-hidden="true" />
                <span>
                  Check-in {HOTEL.checkInTime} · Check-out {HOTEL.checkOutTime}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* -------------------------------------------------------- Bottom */}
        <div className="shms-footer-bottom">
          <p>&copy; {year} Ocean Stays. All rights reserved.</p>
          <ul className="shms-footer-legal">
            <li>
              <Link className="shms-footer-link" to="/contact">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link className="shms-footer-link" to="/contact">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link className="shms-footer-link" to="/contact">
                Cancellation Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
