import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import PublicNavbar from "./PublicNavbar";
import "../../styles/layout.css";

/**
 * Shell for every public-facing page: navigation, the routed page, and the
 * footer.
 *
 * Routes listed in HERO_ROUTES render a full-bleed hero, so the navbar starts
 * transparent and the page content is *not* pushed below it. Every other page
 * gets top padding equal to the navbar height.
 */

/**
 * Routes whose page opens with a full-bleed hero. These render underneath a
 * transparent navbar and supply their own top spacing; every other page gets
 * padding equal to the navbar height.
 */
const HERO_ROUTES = ["/"];

function PublicLayout() {
  const location = useLocation();
  const hasHero = HERO_ROUTES.includes(location.pathname);

  // A new page should start at the top, not wherever the previous one was.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className={`shms-page${hasHero ? "" : " shms-page-offset"}`}>
      <a className="shms-skip-link" href="#main-content">
        Skip to main content
      </a>

      <PublicNavbar transparent={hasHero} />

      <main id="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
