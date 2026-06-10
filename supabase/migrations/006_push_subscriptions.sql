-- ── PUSH SUBSCRIPTIONS ────────────────────────────────────
-- Web Push (VAPID) subscription endpoints per user/device

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (admin client) can read/delete expired subscriptions
CREATE POLICY "Service role full access"
  ON push_subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
