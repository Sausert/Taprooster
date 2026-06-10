-- ── INVITE TOKENS: add used_at timestamp ──────────────────
-- Track exactly when a token was consumed during registration

ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
