-- Fix leaderboard view: only count past shifts (date <= today), not future planned ones
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.preferred_frequency AS target,
  COUNT(a.id) FILTER (
    WHERE a.status IN ('confirmed', 'assigned')
    AND EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM NOW())
    AND s.date <= CURRENT_DATE
  ) AS taps_this_year,
  RANK() OVER (
    ORDER BY COUNT(a.id) FILTER (
      WHERE a.status IN ('confirmed', 'assigned')
      AND EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM NOW())
      AND s.date <= CURRENT_DATE
    ) DESC
  ) AS rank
FROM profiles p
LEFT JOIN shift_assignments a ON a.user_id = p.id
LEFT JOIN shifts s ON s.id = a.shift_id
GROUP BY p.id, p.full_name, p.preferred_frequency;
