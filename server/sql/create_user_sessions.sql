CREATE TABLE IF NOT EXISTS user_sessions (
  user_id uuid PRIMARY KEY,
  last_active_at timestamp with time zone NOT NULL DEFAULT now()
);
