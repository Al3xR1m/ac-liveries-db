-- ============================================
-- AC LIVERIES DB — Patch v6
-- Adds edit_token to artists for secure edit links
-- Run in Supabase > SQL Editor
-- ============================================

ALTER TABLE artists ADD COLUMN IF NOT EXISTS edit_token text UNIQUE;

-- Allow public read of artists by token (for artist-edit page)
-- Already covered by existing "Public read artists" policy
-- Just need to allow artists to update their own liveries via token verification

-- Function to verify token and get artist id
CREATE OR REPLACE FUNCTION get_artist_by_token(p_token text)
RETURNS uuid AS $$
  SELECT id FROM artists WHERE edit_token = p_token LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to update livery if artist owns it (verified by token)
CREATE OR REPLACE FUNCTION update_livery_as_artist(
  p_token text,
  p_livery_id uuid,
  p_image_url text,
  p_download_url text,
  p_notes text,
  p_is_paid boolean,
  p_driver text,
  p_team text
) RETURNS boolean AS $$
DECLARE
  v_artist_id uuid;
BEGIN
  -- Get artist from token
  SELECT id INTO v_artist_id FROM artists WHERE edit_token = p_token;
  IF v_artist_id IS NULL THEN RETURN false; END IF;

  -- Check livery belongs to this artist
  IF NOT EXISTS (SELECT 1 FROM liveries WHERE id = p_livery_id AND artist_id = v_artist_id) THEN
    RETURN false;
  END IF;

  -- Update allowed fields only
  UPDATE liveries SET
    image_url    = p_image_url,
    download_url = p_download_url,
    notes        = p_notes,
    is_paid      = p_is_paid,
    driver       = p_driver,
    team         = p_team
  WHERE id = p_livery_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
