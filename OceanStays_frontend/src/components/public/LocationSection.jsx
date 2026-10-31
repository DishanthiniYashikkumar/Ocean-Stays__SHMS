import { Link } from "react-router-dom";
import { HOTEL } from "../../services/contentService";
import "../../styles/home.css";

/** Where we are, how to reach us, and when the doors open. */
function LocationSection() {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(HOTEL.mapQuery)}&output=embed`;

  return (
    <section className="shms-section shms-section-alt" aria-labelledby="location-title">
      <div className="shms-container">
        <div className="shms-location">
          <div>
            <p className="shms-eyebrow">Find Us</p>

            <h2 className="shms-heading" id="location-title">
              On the Southern Coast, Minutes from Galle Fort
            </h2>

            <p className="shms-subheading">
              Ninety minutes from Colombo by expressway, or two hours by the coastal train — one
              of the most scenic rail journeys in the country.
            </p>

            <ul className="shms-location-list">
              <li>
                <span className="shms-location-icon" aria-hidden="true">
                  <i className="bi bi-geo-alt" />
                </span>
                <div>
                  <strong>Address</strong>
                  <span>
                    {HOTEL.address.line1}, {HOTEL.address.line2}, {HOTEL.address.country}
                  </span>
                </div>
              </li>

              <li>
                <span className="shms-location-icon" aria-hidden="true">
                  <i className="bi bi-telephone" />
                </span>
                <div>
                  <strong>Reservations</strong>
                  <a href={`tel:${HOTEL.phone.replace(/\s/g, "")}`}>{HOTEL.phone}</a>
                </div>
              </li>

              <li>
                <span className="shms-location-icon" aria-hidden="true">
                  <i className="bi bi-envelope" />
                </span>
                <div>
                  <strong>Email</strong>
                  <a href={`mailto:${HOTEL.email}`}>{HOTEL.email}</a>
                </div>
              </li>

              <li>
                <span className="shms-location-icon" aria-hidden="true">
                  <i className="bi bi-clock-history" />
                </span>
                <div>
                  <strong>Check-in &amp; Check-out</strong>
                  <span>
                    Arrive from {HOTEL.checkInTime} · Depart by {HOTEL.checkOutTime}
                  </span>
                </div>
              </li>
            </ul>

            <Link className="shms-btn shms-btn-outline" to="/contact">
              <i className="bi bi-send" aria-hidden="true" />
              Send us a message
            </Link>
          </div>

          <div className="shms-location-map">
            <iframe
              title={`Map showing the location of ${HOTEL.name}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LocationSection;
