-- Guest-notification switches edited on the admin Settings page (one row).
CREATE TABLE IF NOT EXISTS notification_setting (
    setting_id            integer PRIMARY KEY DEFAULT 1 CHECK (setting_id = 1),
    booking_confirmation  boolean NOT NULL DEFAULT true,
    check_in_reminder     boolean NOT NULL DEFAULT true,
    check_out_reminder    boolean NOT NULL DEFAULT true,
    payment_receipts      boolean NOT NULL DEFAULT true,
    service_updates       boolean NOT NULL DEFAULT true,
    marketing_emails      boolean NOT NULL DEFAULT false,
    updated_at            timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO notification_setting (setting_id) VALUES (1) ON CONFLICT (setting_id) DO NOTHING;
