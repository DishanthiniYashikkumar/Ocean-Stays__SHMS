import { Link } from "react-router-dom";
import "../../styles/home.css";

/** Closing booking prompt before the footer. */

const CTA_IMAGE =
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1800&q=80";

function FinalCTA() {
  return (
    <section className="shms-cta" aria-labelledby="cta-title">
      <img src={CTA_IMAGE} alt="" aria-hidden="true" loading="lazy" decoding="async" />

      <div className="shms-container">
        <p className="shms-eyebrow" style={{ color: "var(--gold-300)" }}>
          Reserve Your Stay
        </p>

        <h2 id="cta-title">Your table by the water is already set.</h2>

        <p>
          Check availability in seconds. Free cancellation up to 48 hours before arrival on most
          rates, and the best price guaranteed when you book direct.
        </p>

        <div className="shms-cta-actions">
          <Link className="shms-btn shms-btn-gold shms-btn-lg" to="/rooms">
            Book Your Stay
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          <Link className="shms-btn shms-btn-ghost-light shms-btn-lg" to="/contact">
            <i className="bi bi-telephone" aria-hidden="true" />
            Talk to reservations
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
