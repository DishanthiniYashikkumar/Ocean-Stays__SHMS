-- Indexes for the lookups the API makes on every page load.
CREATE INDEX IF NOT EXISTS idx_reservation_guest ON reservation (guest_id);
CREATE INDEX IF NOT EXISTS idx_reservation_dates ON reservation (check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservation_room_room ON reservation_room (room_id);
CREATE INDEX IF NOT EXISTS idx_reservation_room_reservation ON reservation_room (reservation_id);
CREATE INDEX IF NOT EXISTS idx_service_request_staff ON service_request (assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_service_request_room ON service_request (room_id);
CREATE INDEX IF NOT EXISTS idx_service_request_stay ON service_request (reservation_room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_task_request ON housekeeping_task (service_request_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_status ON notification (user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_reservation ON payment (reservation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
