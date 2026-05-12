-- Allow admins to insert notifications for any user (server-side operations)
CREATE POLICY "Admins can insert notifications for all users"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
