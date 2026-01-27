-- SECURITY HARDENING SCRIPT
-- RUN THIS IN SUPABASE QUERY EDITOR

-- 1. Enable Row Level Security on the strict table
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh (avoids conflicts)
DROP POLICY IF EXISTS "Users can read own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON characters;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON characters;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON characters;

-- 3. Create READ-ONLY policy for authenticated users
-- Users can only SEE their own characters.
-- They CANNOT INSERT, UPDATE, or DELETE directly using the Client API.
CREATE POLICY "Enable read access for users based on user_id" ON "public"."characters"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Repeat for other strict tables if they exist
-- (e.g. if you have a separate inventory table, otherwise if it's JSON in characters, point 1covers it)

-- OPTIONAL: Secure 'messages' table if you want Chat to be server-only too
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Read messages" ON messages FOR SELECT USING (true);
-- (We assume server handles inserts for messages via socket, so users don't need INSERT permission directly)
