-- Room turnaround needs states the original CHECK didn't allow:
--   Occupied (guest checked in), Cleaning (task in progress), Clean (awaiting inspection).
ALTER TABLE room DROP CONSTRAINT IF EXISTS chk_room_status;
ALTER TABLE room ADD CONSTRAINT chk_room_status CHECK (
    status IN ('Available', 'Inspected', 'Reserved', 'Occupied', 'Dirty', 'Cleaning', 'Clean', 'Maintaining')
);
