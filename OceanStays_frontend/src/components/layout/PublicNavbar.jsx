import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDashboardRoute, ROLE_LABELS } from "../../services/authService";
import { initials } from "../../utils/format";
import "../../styles/navbar.css";

/**
 * Public site navigation.
 *
 * Two visual states: transparent while sitting over a hero image, and solid
 * once the page is scrolled. The mobile drawer and account menu are controlled
 * React components rather than Bootstrap's JS, so we keep full control over
 * focus and ARIA.
 *
 * @param {{ transparent?: boolean }} props
 *   transparent — the page beneath starts with a full-bleed hero.
 */

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/rooms", label: "Rooms" },
  { to: "/facilities", label: "Facilities" },
  { to: "/activities", label: "Activities" },
  { to: "/gallery", label: "Gallery" },
  { to: "/testimonials", label: "Testimonials" },
  { to: "/contact", label: "Contact" },
];

/** Past this many pixels the transparent navbar commits to its solid state. */
const SCROLL_THRESHOLD = 24;

function PublicNavbar({ transparent = false }) {
  const drawerId = useId();
  const menuId = useId();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const accountRef = useRef(null);

  /* ---- Scroll state ---------------------------------------------------- */
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    }

    handleScroll(); // a reload part-way down the page must not flash transparent
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---- Drawer: escape key, body scroll lock, focus handling ------------- */
  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    // Move focus into the drawer so the next Tab lands inside it.
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  /* ---- Account menu: escape key and click-away -------------------------- */
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    function handlePointerDown(event) {
      if (!accountRef.current?.contains(event.target)) setIsMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isMenuOpen]);

  /** Dismissing the drawer in place returns focus to the control that opened it. */
  function closeDrawer() {
    setIsDrawerOpen(false);
    toggleRef.current?.focus();
  }

  /** Navigating away closes it too, but focus belongs to the new page. */
  function handleDrawerNavigate() {
    setIsDrawerOpen(false);
  }

  function handleSignOut() {
    setIsMenuOpen(false);
    setIsDrawerOpen(false);
    signOut();
    navigate("/");
  }

  const isTransparent = transparent && !isScrolled && !isDrawerOpen;
  const dashboardRoute = getDashboardRoute(user?.role);

  const navClassName = [
    "shms-nav",
    isTransparent ? "shms-nav-transparent" : "shms-nav-solid",
    isScrolled ? "shms-nav-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={navClassName}>
        <nav className="shms-nav-inner" aria-label="Primary">
          <Link className="shms-nav-brand" to="/">
            <span className="shms-nav-mark" aria-hidden="true">
              <i className="bi bi-water" />
            </span>
            <span className="shms-nav-wordmark">
              <span className="shms-nav-name">OCEAN STAYS</span>
              <span className="shms-nav-tagline">Luxury Coastal Hospitality</span>
            </span>
          </Link>

          <ul className="shms-nav-links">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `shms-nav-link${isActive ? " is-active" : ""}`}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="shms-nav-actions">
            {isAuthenticated ? (
              <div className="shms-account" ref={accountRef}>
                <button
                  type="button"
                  className="shms-account-trigger"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-expanded={isMenuOpen}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                >
                  <span className="shms-account-avatar" aria-hidden="true">
                    {initials(user.name)}
                  </span>
                  <span className="shms-account-name">{user.name}</span>
                  <i className="bi bi-chevron-down shms-account-caret" aria-hidden="true" />
                </button>

                {isMenuOpen && (
                  <div className="shms-account-menu" id={menuId} role="menu">
                    <div className="shms-account-head">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                      <span className="shms-account-role">
                        {ROLE_LABELS[user.role] ?? "Guest"}
                      </span>
                    </div>

                    <Link
                      className="shms-account-item"
                      to={dashboardRoute}
                      role="menuitem"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <i className="bi bi-speedometer2" aria-hidden="true" />
                      My Dashboard
                    </Link>

                    <button
                      type="button"
                      className="shms-account-item shms-account-item-danger"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <i className="bi bi-box-arrow-right" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="shms-nav-signin" to="/login">
                Sign In
              </Link>
            )}

            <Link className="shms-btn shms-btn-gold shms-btn-sm" to="/rooms">
              Book Your Stay
            </Link>

            <button
              ref={toggleRef}
              type="button"
              className="shms-nav-toggle"
              onClick={() => setIsDrawerOpen((open) => !open)}
              aria-expanded={isDrawerOpen}
              aria-controls={drawerId}
              aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
            >
              <span className="shms-nav-toggle-bars" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------------ Mobile drawer */}
      {isDrawerOpen && (
        <>
          <button
            type="button"
            className="shms-nav-scrim"
            onClick={closeDrawer}
            tabIndex={-1}
            aria-hidden="true"
          />

          <div
            id={drawerId}
            className="shms-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="shms-nav-drawer-head">
              <p className="shms-nav-drawer-title">OCEAN STAYS</p>
              <button
                ref={closeRef}
                type="button"
                className="shms-nav-drawer-close"
                onClick={closeDrawer}
                aria-label="Close menu"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <ul className="shms-nav-drawer-links">
              {NAV_LINKS.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={handleDrawerNavigate}
                    className={({ isActive }) =>
                      `shms-nav-drawer-link${isActive ? " is-active" : ""}`
                    }
                  >
                    {label}
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="shms-nav-drawer-actions">
              {isAuthenticated ? (
                <>
                  <Link
                    className="shms-btn shms-btn-outline shms-btn-block"
                    to={dashboardRoute}
                    onClick={handleDrawerNavigate}
                  >
                    <i className="bi bi-speedometer2" aria-hidden="true" />
                    My Dashboard
                  </Link>
                  <button
                    type="button"
                    className="shms-btn shms-btn-outline shms-btn-block"
                    onClick={handleSignOut}
                  >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  className="shms-btn shms-btn-outline shms-btn-block"
                  to="/login"
                  onClick={handleDrawerNavigate}
                >
                  <i className="bi bi-person" aria-hidden="true" />
                  Sign In
                </Link>
              )}

              <Link
                className="shms-btn shms-btn-primary shms-btn-block"
                to="/rooms"
                onClick={handleDrawerNavigate}
              >
                Book Your Stay
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default PublicNavbar;
