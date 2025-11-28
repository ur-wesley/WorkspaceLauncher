-- Add track_process column to actions table
-- Add track_process flag to persist whether a process should be tracked for health monitoring
ALTER TABLE actions ADD COLUMN track_process INTEGER NOT NULL DEFAULT 1 CHECK (track_process IN (0, 1));
