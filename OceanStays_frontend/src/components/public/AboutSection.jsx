import { Link } from "react-router-dom";
import "../../styles/home.css";

/**
 * The brand story. Static copy — this is marketing content, not hotel data.
 */

const IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    alt: "A Coastal Suite living room opening onto the terrace",
  },
  {
    src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    alt: "A treatment pavilion at the Coastal Spa",
  },
];

function AboutSection() {
  return (
    <section className="shms-section" aria-labelledby="about-title">
      <div className="shms-container">
        <div className="shms-about">
          <div className="shms-about-media">
            {IMAGES.map(({ src, alt }) => (
              <img key={src} src={src} alt={alt} loading="lazy" decoding="async" />
            ))}

            <div className="shms-about-badge">
              <strong>2013</strong>
              <span>Established</span>
            </div>
          </div>

          <div className="shms-about-body">
            <p className="shms-eyebrow">About Ocean Stays</p>

            <h2 className="shms-heading" id="about-title">
              A quiet stretch of the southern coast, run with unusual care.
            </h2>

            <p>
              Ocean Stays began as a twelve-room guesthouse above a fishing harbour in Galle.
              Twelve years on, we are seventy rooms, suites and villas — and still run by many
              of the same people who opened the doors.
            </p>
            <p>
              Every room faces water. Every arrival is prepared for before it happens. Behind
              the calm sits a hotel management platform that keeps housekeeping, the front desk
              and our service teams working from the same picture, so nothing reaches you as a
              surprise.
            </p>

            <div className="shms-about-signature">
              <i
                className="bi bi-award"
                aria-hidden="true"
                style={{ fontSize: 26, color: "var(--gold-500)" }}
              />
              <div>
                <strong>Rohan De Silva</strong>
                <span>General Manager, Ocean Stays</span>
              </div>
            </div>

            <div style={{ marginTop: "var(--space-6)" }}>
              <Link className="shms-btn shms-btn-outline" to="/facilities">
                Explore the property
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
