-- Add track_process column to actions table (default true for backward compatibility)
ALTER TABLE actions ADD COLUMN track_process BOOLEAN NOT NULL DEFAULT TRUE;
