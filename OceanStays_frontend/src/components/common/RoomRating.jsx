/**
 * A room type's guest rating, as shown on room cards and the room details page.
 *
 * - No reviews yet: a small "New" badge, never "0.0 (0 reviews)".
 * - Rating not available from the API: nothing.
 * - Otherwise: the average rating and review count exactly as the API sent them.
 *
 * @param {{ rating: number | null, reviewCount: number | null }} props
 */
function RoomRating({ rating, reviewCount }) {
  if (reviewCount === 0) {
    return (
      <span className="shms-badge shms-badge-info" title="No guest reviews yet">
        New
      </span>
    );
  }

  if (rating == null || reviewCount == null) return null;

  return (
    <span className="shms-room-rating">
      <i className="bi bi-star-fill" aria-hidden="true" />
      {rating.toFixed(1)}
      <span>
        ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}

export default RoomRating;
