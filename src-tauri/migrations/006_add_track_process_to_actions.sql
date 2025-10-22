-- Add track_process column to actions table (default true for backward compatibility)
ALTER TABLE actions ADD COLUMN track_process INTEGER NOT NULL DEFAULT 1 CHECK (track_process IN (0, 1));
