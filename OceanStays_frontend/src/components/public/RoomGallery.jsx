import { useState } from "react";
import Lightbox from "../common/Lightbox";
import "../../styles/room-details.css";

/**
 * Room image gallery: one large image plus two thumbnails, opening into the
 * shared Lightbox. The last thumbnail carries a "+n photos" overlay when there
 * are more images than the grid shows.
 *
 * @param {{ images: string[], roomName: string }} props
 */

const VISIBLE_THUMBS = 2;

function RoomGallery({ images, roomName }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // The Lightbox works in objects; the room fixture stores plain URLs.
  const lightboxImages = images.map((src, index) => ({
    id: `${roomName}-${index}`,
    src,
    caption: `${roomName} — photograph ${index + 1} of ${images.length}`,
  }));

  const thumbs = images.slice(1, 1 + VISIBLE_THUMBS);
  const hiddenCount = Math.max(0, images.length - 1 - VISIBLE_THUMBS);

  return (
    <>
      <div className="shms-room-gallery">
        <button
          type="button"
          className="shms-room-gallery-main"
          onClick={() => setLightboxIndex(0)}
          aria-label={`View photographs of the ${roomName}`}
        >
          <img src={images[0]} alt={roomName} />
        </button>

        <div className="shms-room-gallery-side">
          {thumbs.map((src, index) => {
            const imageIndex = index + 1;
            const isLastVisible = index === thumbs.length - 1 && hiddenCount > 0;

            return (
              <button
                key={src}
                type="button"
                className="shms-room-gallery-thumb"
                onClick={() => setLightboxIndex(imageIndex)}
                aria-label={
                  isLastVisible
                    ? `View all ${images.length} photographs`
                    : `View photograph ${imageIndex + 1}`
                }
              >
                <img src={src} alt="" />
                {isLastVisible && (
                  <span className="shms-room-gallery-more">
                    <i className="bi bi-images" aria-hidden="true" />+{hiddenCount} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

export default RoomGallery;
