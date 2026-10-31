import { useCallback } from "react";
import { Link } from "react-router-dom";
import RoomCard from "../common/RoomCard";
import RoomCardSkeleton from "../common/RoomCardSkeleton";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getFeaturedRoomTypes } from "../../services/roomService";
import "../../styles/cards.css";

/** Featured room strip. Handles loading, success, empty and error states. */
function FeaturedRooms() {
  const load = useCallback(() => getFeaturedRoomTypes(), []);
  const { data: rooms, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section shms-section-alt" aria-labelledby="rooms-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Accommodation</p>
          <h2 className="shms-heading" id="rooms-title">
            Rooms, Suites &amp; Private Villas
          </h2>
          <p className="shms-subheading">
            Six categories, every one facing water. Choose the view, the space and the level of
            privacy that suits how you travel.
          </p>
        </div>

        {error ? (
          <ErrorState
            title="We couldn't load our rooms"
            message={error.message}
            onRetry={reload}
          />
        ) : isEmpty ? (
          <EmptyState
            title="No rooms to show"
            message="Our room list is being updated. Please check back shortly."
            icon="bi-door-closed"
          >
            <Link className="shms-btn shms-btn-outline" to="/contact">
              Contact reservations
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className="shms-grid shms-grid-4">
              {isLoading ? (
                <RoomCardSkeleton count={4} />
              ) : (
                rooms.map((room) => <RoomCard key={room.id} room={room} />)
              )}
            </div>

            {!isLoading && (
              <div className="shms-section-more">
                <Link className="shms-btn shms-btn-outline shms-btn-lg" to="/rooms">
                  View all rooms
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default FeaturedRooms;
