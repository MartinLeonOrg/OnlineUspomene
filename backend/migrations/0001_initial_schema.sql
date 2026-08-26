-- Migration number: 0001 	 2026-08-26T21:37:59.457Z
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    event_date TEXT,
    upload_token TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    original_name TEXT,
    content_type TEXT NOT NULL,
    file_size INTEGER,
    guest_name TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_photos_event_id
ON photos(event_id);

CREATE INDEX idx_photos_event_status
ON photos(event_id, status);

CREATE INDEX idx_photos_created_at
ON photos(created_at);