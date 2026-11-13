import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import PublicNavbar from "./PublicNavbar";
import { MotionContext } from "../../context/motionContext";
import useScrollReveal from "../../hooks/useScrollReveal";
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
  const mainRef = useRef(null);
  useScrollReveal(mainRef, { key: location.pathname });

  // A new page should start at the top, not wherever the previous one was.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <MotionContext.Provider value={true}>
    <div className={`shms-page${hasHero ? "" : " shms-page-offset"}`} data-motion="on">
      <a className="shms-skip-link" href="#main-content">
        Skip to main content
      </a>

      <PublicNavbar transparent={hasHero} />

      <main id="main-content" ref={mainRef}>
        {/* Keyed by path so each page plays the entrance transition. */}
        <div className="shms-route" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
    </MotionContext.Provider>
  );
}

export default PublicLayout;
