-- SQL Reference for Integer Overflow Fix
-- Execute this in Supabase SQL Editor if needed, or I will try to apply via code if possible.

-- 1. Market Listings
ALTER TABLE market_listings ALTER COLUMN amount TYPE BIGINT;
ALTER TABLE market_listings ALTER COLUMN price TYPE BIGINT;

-- 2. Combat History
ALTER TABLE combat_history ALTER COLUMN xp_gained TYPE BIGINT;
ALTER TABLE combat_history ALTER COLUMN silver_gained TYPE BIGINT;
ALTER TABLE combat_history ALTER COLUMN damage_dealt TYPE BIGINT;
ALTER TABLE combat_history ALTER COLUMN damage_taken TYPE BIGINT;

-- 3. Dungeon History
ALTER TABLE dungeon_history ALTER COLUMN xp_gained TYPE BIGINT;
ALTER TABLE dungeon_history ALTER COLUMN silver_gained TYPE BIGINT;
ALTER TABLE dungeon_history ALTER COLUMN duration_seconds TYPE BIGINT;

-- 4. Characters State (Optional investigation, but state is JSONB, which is safe)
-- However, it is good to ensure silver_gained in notifications is capped too.
