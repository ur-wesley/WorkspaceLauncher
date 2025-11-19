-- Add auto_launch flag to actions to persist service-style auto start preference
ALTER TABLE actions ADD COLUMN auto_launch INTEGER NOT NULL DEFAULT 0 CHECK (auto_launch IN (0, 1));

-- Backfill existing rows to 0 by default (redundant due to DEFAULT but explicit)
UPDATE actions SET auto_launch = COALESCE(auto_launch, 0);








