import { Link } from "react-router-dom";
import "../../styles/home.css";

/**
 * Home page hero. Full-bleed coastal photography with the brand promise.
 * The navbar sits transparent over this — see HERO_ROUTES in PublicLayout.
 */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80";

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
                  <strong>{value}</strong>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <a className="shms-hero-cue" href="#availability">
        Discover
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </a>
    </section>
  );
}

export default Hero;
