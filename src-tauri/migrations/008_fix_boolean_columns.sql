-- Fix boolean columns to use proper SQLite boolean handling
-- SQLite doesn't have a native boolean type, so we use INTEGER with CHECK constraints

-- Update actions table boolean columns
ALTER TABLE actions ADD COLUMN detached_new INTEGER NOT NULL DEFAULT 0 CHECK (detached_new IN (0, 1));
ALTER TABLE actions ADD COLUMN track_process_new INTEGER NOT NULL DEFAULT 1 CHECK (track_process_new IN (0, 1));

-- Copy data from old columns to new columns
UPDATE actions SET detached_new = CASE WHEN detached = 1 THEN 1 ELSE 0 END;
UPDATE actions SET track_process_new = CASE WHEN track_process = 1 THEN 1 ELSE 0 END;

-- Drop old columns
ALTER TABLE actions DROP COLUMN detached;
ALTER TABLE actions DROP COLUMN track_process;

-- Rename new columns to original names
ALTER TABLE actions RENAME COLUMN detached_new TO detached;
ALTER TABLE actions RENAME COLUMN track_process_new TO track_process;

-- Update variables table boolean columns
ALTER TABLE variables ADD COLUMN is_secure_new INTEGER NOT NULL DEFAULT 0 CHECK (is_secure_new IN (0, 1));
ALTER TABLE variables ADD COLUMN enabled_new INTEGER NOT NULL DEFAULT 1 CHECK (enabled_new IN (0, 1));

-- Copy data from old columns to new columns
UPDATE variables SET is_secure_new = CASE WHEN is_secure = 1 THEN 1 ELSE 0 END;
UPDATE variables SET enabled_new = CASE WHEN enabled = 1 THEN 1 ELSE 0 END;

-- Drop old columns
ALTER TABLE variables DROP COLUMN is_secure;
ALTER TABLE variables DROP COLUMN enabled;

-- Rename new columns to original names
ALTER TABLE variables RENAME COLUMN is_secure_new TO is_secure;
ALTER TABLE variables RENAME COLUMN enabled_new TO enabled;






