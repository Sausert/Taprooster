-- ============================================================
-- MIGRATIE 002 — Telefoonnummer + poetsen verwijderen
-- Voer uit in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Voeg telefoonnummer toe aan profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Verwijder poetsen uit shift type check (optioneel — bestaande data blijft geldig)
-- Bestaande shifts van type 'poetsen' blijven bestaan maar nieuwe kunnen niet meer aangemaakt worden
-- via de app. Verwijder handmatig indien gewenst:
-- DELETE FROM shifts WHERE type = 'poetsen';

-- Admin policy voor profiles bijwerken (zodat admins ook andere profielen kunnen bewerken)
DROP POLICY IF EXISTS "Admins update any profile" ON profiles;
CREATE POLICY "Admins update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
