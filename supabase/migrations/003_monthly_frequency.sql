-- ============================================================
-- MIGRATIE 003 — Maandelijkse frequentie + niet-beschikbare maanden
-- Voer uit in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Voeg niet-beschikbare maanden toe (array van maandindexen 0-11)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unavailable_months INTEGER[] NOT NULL DEFAULT '{}';

-- Pas de preferred_frequency betekenis aan: nu per maand (was per jaar)
-- Bestaande waarden schalen we terug (gedeeld door 12, minimaal 1)
UPDATE profiles SET preferred_frequency = GREATEST(1, ROUND(preferred_frequency / 12.0))
WHERE preferred_frequency > 20;

-- Admin policy voor alle shifts bijwerken (admins mogen alles)
DROP POLICY IF EXISTS "Admins manage all shifts" ON shifts;
CREATE POLICY "Admins manage all shifts"
  ON shifts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin kan ook assignments verwijderen
DROP POLICY IF EXISTS "Admins manage all shift_assignments" ON shift_assignments;
CREATE POLICY "Admins manage all shift_assignments"
  ON shift_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
