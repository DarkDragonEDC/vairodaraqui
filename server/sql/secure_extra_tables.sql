-- SECURITY HARDENING: EXTRA TABLES
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Secure Combat History
-- Client reads this via Socket (Server), so direct DB access is NOT needed.
ALTER TABLE "combat_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "combat_history" FROM authenticated;
REVOKE ALL ON "combat_history" FROM anon;

-- 2. Secure Dungeon History
-- Client reads this via Socket (Server).
ALTER TABLE "dungeon_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "dungeon_history" FROM authenticated;
REVOKE ALL ON "dungeon_history" FROM anon;

-- 3. Secure User Sessions
-- Server manages this via API.
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "user_sessions" FROM authenticated;
REVOKE ALL ON "user_sessions" FROM anon;

-- 4. Cleanup (Remove any old permissive policies if they exist)
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON "combat_history";
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON "dungeon_history";
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON "user_sessions";
DROP POLICY IF EXISTS "Public read access" ON "combat_history";
DROP POLICY IF EXISTS "Public read access" ON "dungeon_history";
DROP POLICY IF EXISTS "Public read access" ON "user_sessions";

DO $$
BEGIN
  RAISE NOTICE 'Extra Tables Locked Down: Clients have NO direct access.';
END
$$;
