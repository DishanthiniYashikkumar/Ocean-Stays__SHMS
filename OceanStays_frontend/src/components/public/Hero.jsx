import { Link } from "react-router-dom";
import CountUp from "../common/CountUp";
import "../../styles/home.css";

/**
 * Home page hero. Full-bleed coastal photography with the brand promise.
 * The navbar sits transparent over this — see HERO_ROUTES in PublicLayout.
 */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80";

// Each path repeats every 1440 units across a 2880-wide box, so sliding it by
// half its width loops without a seam.
const SHORE_BACK =
  "M0 52 C240 18 480 18 720 52 S1200 86 1440 52 S1920 18 2160 52 S2640 86 2880 52 V100 H0 Z";
const SHORE_FRONT =
  "M0 70 C240 44 480 44 720 70 S1200 96 1440 70 S1920 44 2160 70 S2640 96 2880 70 V100 H0 Z";

const STATS = [
  { value: "70", label: "Rooms & Villas" },
  { value: "4.8", label: "Guest Rating" },
  { value: "12", label: "Years of Service" },
];

function Hero() {
  return (
    <section className="shms-hero" aria-labelledby="hero-title">
      <img
        className="shms-hero-media"
        src={HERO_IMAGE}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className="shms-hero-overlay" aria-hidden="true" />

      <div className="shms-hero-inner">
        <div className="shms-container">
          <div className="shms-hero-copy">
            <p className="shms-hero-eyebrow">
              <i className="bi bi-water" aria-hidden="true" />
              Luxury Coastal Resort · Galle, Sri Lanka
            </p>

            <h1 className="shms-hero-title" id="hero-title">
              Where the Ocean Meets Exceptional Hospitality.
            </h1>

            <p className="shms-hero-lede">
              Experience effortless stays, thoughtful service, and smart hospitality at Ocean
              Stays.
            </p>

            <div className="shms-hero-actions">
              <Link className="shms-btn shms-btn-gold shms-btn-lg" to="/rooms">
                Explore Rooms
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
              <a className="shms-btn shms-btn-ghost-light shms-btn-lg" href="#availability">
                Book Your Stay
              </a>
            </div>

            <ul className="shms-hero-stats">
              {STATS.map(({ value, label }) => (
                <li key={label} className="shms-hero-stat">
                  <strong>
                    <CountUp value={value} duration={1400} />
                  </strong>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* A shoreline rolling along the bottom edge; two layers drift at different speeds. */}
      <div className="shms-hero-waves" aria-hidden="true">
        <svg className="shms-hero-wave shms-hero-wave-back" viewBox="0 0 2880 100" preserveAspectRatio="none">
          <path d={SHORE_BACK} />
        </svg>
        <svg className="shms-hero-wave shms-hero-wave-front" viewBox="0 0 2880 100" preserveAspectRatio="none">
          <path d={SHORE_FRONT} />
        </svg>
      </div>

      <a className="shms-hero-cue" href="#availability">
        Discover
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </a>
    </section>
  );
}

export default Hero;
