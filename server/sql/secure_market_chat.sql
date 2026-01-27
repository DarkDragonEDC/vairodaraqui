-- SECURITY HARDENING: MARKET & CHAT
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Secure Market Listings
ALTER TABLE "market_listings" ENABLE ROW LEVEL SECURITY;

-- Revoke WRITE permissions (Only Server can list items)
REVOKE INSERT, UPDATE, DELETE ON "market_listings" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON "market_listings" FROM anon;

-- Grant READ permission (Users need to see the market)
GRANT SELECT ON "market_listings" TO authenticated;

-- Create Policy for READ (If not exists)
DROP POLICY IF EXISTS "Public read market" ON "market_listings";
CREATE POLICY "Public read market" ON "market_listings" FOR SELECT TO authenticated USING (true);


-- 2. Secure Messages (Chat)
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

-- Revoke WRITE permissions (Only Server inserts messages for rate limiting/validation)
REVOKE INSERT, UPDATE, DELETE ON "messages" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON "messages" FROM anon;

-- Grant READ permission (Users need to see chat)
GRANT SELECT ON "messages" TO authenticated;

-- Create Policy for READ
DROP POLICY IF EXISTS "Public read messages" ON "messages";
CREATE POLICY "Public read messages" ON "messages" FOR SELECT TO authenticated USING (true);

DO $$
BEGIN
  RAISE NOTICE 'Market & Chat Locked Down: Clients can READ but only Server can WRITE.';
END
$$;
