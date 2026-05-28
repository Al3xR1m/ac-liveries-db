-- ============================================
-- AC LIVERIES DB — Patch v7
-- Adds: addons table, mod description/version/changelog
-- Run in Supabase > SQL Editor
-- ============================================

-- ---- Add fields to mods ----
ALTER TABLE mods ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE mods ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE mods ADD COLUMN IF NOT EXISTS changelog text;

-- ---- Addons table ----
CREATE TABLE IF NOT EXISTS addons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mod_id uuid REFERENCES mods(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  addon_type text DEFAULT 'other',
  author text,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  download_url text,
  image_url text,
  notes text,
  is_paid boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ---- Addon votes table ----
CREATE TABLE IF NOT EXISTS addon_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_id uuid REFERENCES addons(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(addon_id, fingerprint)
);

-- ---- RLS ----
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved addons" ON addons FOR SELECT USING (approved = true);
CREATE POLICY "Anon read all addons"        ON addons FOR SELECT USING (true);
CREATE POLICY "Anyone can submit addon"     ON addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage addons"         ON addons FOR ALL   USING (true) WITH CHECK (true);
CREATE POLICY "Public read addon votes"     ON addon_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote addon"       ON addon_votes FOR INSERT WITH CHECK (true);

-- ---- Grants ----
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE addons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE addon_votes TO anon, authenticated;

-- ---- Upvote / remove upvote for addons ----
CREATE OR REPLACE FUNCTION increment_addon_upvote(addon_id uuid, browser_fp text)
RETURNS void AS $$
BEGIN
  INSERT INTO addon_votes (addon_id, fingerprint) VALUES (addon_id, browser_fp);
  UPDATE addons SET upvotes = upvotes + 1 WHERE id = addon_id;
EXCEPTION WHEN unique_violation THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_addon_upvote(p_addon_id uuid, browser_fp text)
RETURNS void AS $$
BEGIN
  DELETE FROM addon_votes WHERE addon_votes.addon_id = p_addon_id AND addon_votes.fingerprint = browser_fp;
  UPDATE addons SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = p_addon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_addon_upvote(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_addon_upvote(uuid, text) TO anon, authenticated;
