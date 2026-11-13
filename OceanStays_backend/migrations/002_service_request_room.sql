-- Staff need to raise maintenance / re-clean requests for rooms that have no
-- current stay. A request now points at a room directly; the stay link
-- (reservation_room_id) becomes optional, but one of the two must be present.
ALTER TABLE service_request ADD COLUMN IF NOT EXISTS room_id integer;

ALTER TABLE service_request DROP CONSTRAINT IF EXISTS fk_service_room;
ALTER TABLE service_request ADD CONSTRAINT fk_service_room
    FOREIGN KEY (room_id) REFERENCES room (room_id);

UPDATE service_request sr
SET room_id = rr.room_id
FROM reservation_room rr
WHERE rr.reservation_room_id = sr.reservation_room_id
  AND sr.room_id IS NULL;

ALTER TABLE service_request ALTER COLUMN reservation_room_id DROP NOT NULL;

ALTER TABLE service_request DROP CONSTRAINT IF EXISTS chk_service_target;
ALTER TABLE service_request ADD CONSTRAINT chk_service_target
    CHECK (reservation_room_id IS NOT NULL OR room_id IS NOT NULL);
