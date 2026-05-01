-- ============================================================
-- WALHALLA TAPROOSTER — Supabase Database Schema
-- Voer dit uit in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PROFILES ──────────────────────────────────────────────
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'tapper' CHECK (role IN ('tapper', 'admin')),
  preferred_frequency INTEGER NOT NULL DEFAULT 10 CHECK (preferred_frequency BETWEEN 1 AND 100),
  preferred_days      TEXT[] NOT NULL DEFAULT '{}',
  preferred_roles     TEXT[] NOT NULL DEFAULT '{"tapper"}',
  wants_parties       BOOLEAN NOT NULL DEFAULT false,
  wants_cleaning      BOOLEAN NOT NULL DEFAULT false,
  language            TEXT NOT NULL DEFAULT 'nl' CHECK (language IN ('nl', 'en')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TAPPER PREFERENCES (met wie je graag tappet) ──────────
CREATE TABLE tapper_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_tapper_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preference_order      INTEGER NOT NULL CHECK (preference_order BETWEEN 1 AND 3),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_order),
  UNIQUE(user_id, preferred_tapper_id)
);

-- ── EVENTS ────────────────────────────────────────────────
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('tapavond', 'feestje', 'poetsen')),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SHIFTS ────────────────────────────────────────────────
CREATE TABLE shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('tapavond', 'feestje', 'poetsen')),
  role        TEXT NOT NULL DEFAULT 'tapper' CHECK (role IN ('tapper', 'bonnenkassa', 'poetsploeg')),
  max_tappers INTEGER NOT NULL DEFAULT 2 CHECK (max_tappers > 0),
  status      TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'published')),
  admin_note  TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast date queries
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_status ON shifts(status);

-- ── SHIFT ASSIGNMENTS ──────────────────────────────────────
CREATE TABLE shift_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'assigned'
                  CHECK (status IN ('assigned', 'confirmed', 'declined', 'open')),
  confirmed_at  TIMESTAMPTZ,
  declined_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, user_id)
);

CREATE INDEX idx_assignments_user ON shift_assignments(user_id);
CREATE INDEX idx_assignments_shift ON shift_assignments(shift_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE notifications (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  message   TEXT NOT NULL,
  read      BOOLEAN NOT NULL DEFAULT false,
  shift_id  UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ── ADMIN MESSAGES ────────────────────────────────────────
CREATE TABLE admin_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  shift_id    UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVITE TOKENS ─────────────────────────────────────────
CREATE TABLE invite_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  used_by     UUID REFERENCES profiles(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────

-- Profiles: users see all, update only own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Tapper preferences: own only
ALTER TABLE tapper_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences"
  ON tapper_preferences FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Events: viewable by all auth, writable by admin
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by authenticated"
  ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage events"
  ON events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Shifts: viewable by all auth, writable by admin
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published shifts viewable by authenticated"
  ON shifts FOR SELECT TO authenticated
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can manage shifts"
  ON shifts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Assignments: own or admin
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own assignments"
  ON shift_assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Users manage own assignments"
  ON shift_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own assignments"
  ON shift_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all assignments"
  ON shift_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Notifications: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admin messages: all can read
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth users can read messages"
  ON admin_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write messages"
  ON admin_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Invite tokens: admins only
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invite tokens"
  ON invite_tokens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Token can be read by anyone for registration"
  ON invite_tokens FOR SELECT USING (true);

-- ── HELPER VIEWS ──────────────────────────────────────────

-- Shift occupancy view
CREATE VIEW shift_occupancy AS
SELECT
  s.id,
  s.title,
  s.date,
  s.start_time,
  s.end_time,
  s.type,
  s.role,
  s.max_tappers,
  s.status,
  s.admin_note,
  COUNT(a.id) FILTER (WHERE a.status != 'declined') AS assigned_count,
  COUNT(a.id) FILTER (WHERE a.status = 'confirmed') AS confirmed_count,
  s.max_tappers - COUNT(a.id) FILTER (WHERE a.status != 'declined') AS open_spots
FROM shifts s
LEFT JOIN shift_assignments a ON a.shift_id = s.id
GROUP BY s.id;

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.preferred_frequency AS target,
  COUNT(a.id) FILTER (
    WHERE a.status IN ('confirmed', 'assigned')
    AND EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM NOW())
  ) AS taps_this_year,
  RANK() OVER (
    ORDER BY COUNT(a.id) FILTER (
      WHERE a.status IN ('confirmed', 'assigned')
      AND EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM NOW())
    ) DESC
  ) AS rank
FROM profiles p
LEFT JOIN shift_assignments a ON a.user_id = p.id
LEFT JOIN shifts s ON s.id = a.shift_id
GROUP BY p.id, p.full_name, p.preferred_frequency;

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Tapper')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── SEED: FIRST ADMIN ──────────────────────────────────────
-- Pas het e-mailadres aan na het aanmaken van je eerste account:
-- UPDATE profiles SET role = 'admin' WHERE email = 'jouw@email.nl';
