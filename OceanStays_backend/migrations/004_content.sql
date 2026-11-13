-- Messages sent from the public Contact page.
CREATE TABLE IF NOT EXISTS contact_message (
    contact_message_id serial PRIMARY KEY,
    name        varchar(150) NOT NULL,
    email       varchar(150) NOT NULL,
    subject     varchar(200),
    message     text NOT NULL,
    status      varchar(20) NOT NULL DEFAULT 'New'
                CHECK (status IN ('New', 'Read', 'Replied', 'Archived')),
    created_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fields the admin Facilities form edits that had nowhere to live.
ALTER TABLE facility ADD COLUMN IF NOT EXISTS icon varchar(50);
ALTER TABLE facility ADD COLUMN IF NOT EXISTS capacity varchar(50);

-- The guest Feedback form asks what the feedback is about.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS category varchar(30);
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_feedback_category;
ALTER TABLE feedback ADD CONSTRAINT chk_feedback_category CHECK (
    category IS NULL OR category IN ('OVERALL', 'ROOM', 'DINING', 'SERVICE', 'FACILITIES', 'HOUSEKEEPING')
);
