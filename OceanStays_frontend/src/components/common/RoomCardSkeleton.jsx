import "../../styles/cards.css";

/**
 * Placeholder matching RoomCard's proportions, so the grid doesn't reflow when
 * real data arrives.
 *
 * @param {{ count?: number }} props
 */
function RoomCardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="shms-room-skeleton" aria-hidden="true">
          <div className="shms-skeleton shms-room-skeleton-media" />

          <div className="shms-room-skeleton-body">
            <div className="shms-skeleton shms-skeleton-text" style={{ width: "30%" }} />
            <div className="shms-skeleton shms-skeleton-title" style={{ width: "70%" }} />
            <div className="shms-skeleton shms-skeleton-text" />
            <div className="shms-skeleton shms-skeleton-text" style={{ width: "85%" }} />
            <div
              className="shms-skeleton shms-skeleton-text"
              style={{ width: "55%", marginTop: "var(--space-4)" }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

export default RoomCardSkeleton;
