-- ============================================
-- AC LIVERIES DB — Supabase Setup Script v2
-- Run this in Supabase > SQL Editor
-- ============================================

-- Drop existing tables (clean reinstall)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS liveries CASCADE;
DROP TABLE IF EXISTS championships CASCADE;
DROP TABLE IF EXISTS mods CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ---- Table: categories ----
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color_bg text NOT NULL DEFAULT '#E6F1FB',
  color_text text NOT NULL DEFAULT '#0C447C',
  created_at timestamptz DEFAULT now()
);

-- ---- Table: mods ----
CREATE TABLE mods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  official_url text,
  created_at timestamptz DEFAULT now()
);

-- ---- Table: championships ----
CREATE TABLE championships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  short_name text,
  season text,
  mod_id uuid REFERENCES mods(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ---- Table: liveries ----
CREATE TABLE liveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mod_id uuid REFERENCES mods(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  championship_id uuid REFERENCES championships(id) ON DELETE SET NULL,
  team text,
  driver text,
  season text,
  author text,
  download_url text,
  image_url text,
  notes text,
  upvotes integer DEFAULT 0,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ---- Table: votes ----
CREATE TABLE votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  livery_id uuid REFERENCES liveries(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(livery_id, fingerprint)
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE liveries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories"    ON categories    FOR SELECT USING (true);
CREATE POLICY "Public read mods"          ON mods          FOR SELECT USING (true);
CREATE POLICY "Public read championships" ON championships FOR SELECT USING (true);
CREATE POLICY "Public read approved"      ON liveries      FOR SELECT USING (approved = true);
CREATE POLICY "Admin read all liveries"   ON liveries      FOR SELECT USING (true);
CREATE POLICY "Public read votes"         ON votes         FOR SELECT USING (true);

CREATE POLICY "Anyone can submit livery"  ON liveries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can vote"           ON votes    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin manage categories"    ON categories    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage mods"          ON mods          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage championships" ON championships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage liveries"      ON liveries      FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete liveries"      ON liveries      FOR DELETE USING (true);

-- ============================================
-- Safe upvote function
-- ============================================
CREATE OR REPLACE FUNCTION increment_upvote(livery_id uuid, browser_fp text)
RETURNS void AS $$
BEGIN
  INSERT INTO votes (livery_id, fingerprint) VALUES (livery_id, browser_fp);
  UPDATE liveries SET upvotes = upvotes + 1 WHERE id = livery_id;
EXCEPTION WHEN unique_violation THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Seed: Categories
-- ============================================
INSERT INTO categories (name, color_bg, color_text) VALUES
('Formula',   '#E6F1FB', '#0C447C'),
('GT',        '#E1F5EE', '#085041'),
('Hillclimb', '#FAEEDA', '#633806'),
('Touring',   '#EEEDFE', '#3C3489');

-- ============================================
-- Seed: Mods
-- ============================================
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula Hybrid 2024', id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula Hybrid 2022', id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula Hybrid 2021', id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula 2 V6',        id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula 3',           id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Formula 4',           id, 'https://www.racesimstudio.com' FROM categories WHERE name='Formula';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS GT3',                 id, 'https://www.racesimstudio.com' FROM categories WHERE name='GT';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS GT Pack',             id, 'https://www.racesimstudio.com' FROM categories WHERE name='GT';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Hillclimb',           id, 'https://www.racesimstudio.com' FROM categories WHERE name='Hillclimb';
INSERT INTO mods (name, category_id, official_url) SELECT 'RSS Touring Cars',        id, 'https://www.racesimstudio.com' FROM categories WHERE name='Touring';

-- ============================================
-- Seed: Championships
-- ============================================
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'Formula 1 World Championship 2024','F1 2024','2024',id FROM mods WHERE name='RSS Formula Hybrid 2024';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'Formula 1 World Championship 2022','F1 2022','2022',id FROM mods WHERE name='RSS Formula Hybrid 2022';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'Formula 2 Championship 2023','F2 2023','2023',id FROM mods WHERE name='RSS Formula 2 V6';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'Blancpain GT Series 2023','Blancpain 2023','2023',id FROM mods WHERE name='RSS GT3';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'WEC GTE 2023','WEC 2023','2023',id FROM mods WHERE name='RSS GT3';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'IMSA WeatherTech 2023','IMSA 2023','2023',id FROM mods WHERE name='RSS GT3';
INSERT INTO championships (name, short_name, season, mod_id) SELECT 'Pikes Peak 2023','Pikes Peak','2023',id FROM mods WHERE name='RSS Hillclimb';

-- ============================================
-- Seed: Sample liveries
-- ============================================
INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'Ferrari — C. Leclerc #16', m.id, c.id, ch.id, 'Scuderia Ferrari','Charles Leclerc','2024','SimPainter_IT','https://www.racedepartment.com',142,true
FROM mods m, categories c, championships ch WHERE m.name='RSS Formula Hybrid 2024' AND c.name='Formula' AND ch.name='Formula 1 World Championship 2024';

INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'Red Bull — M. Verstappen #1', m.id, c.id, ch.id, 'Red Bull Racing','Max Verstappen','2024','F1Skinner','https://www.racedepartment.com',118,true
FROM mods m, categories c, championships ch WHERE m.name='RSS Formula Hybrid 2024' AND c.name='Formula' AND ch.name='Formula 1 World Championship 2024';

INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'Aston Martin — F. Alonso #14', m.id, c.id, ch.id, 'Aston Martin','Fernando Alonso','2024','LiveryLab','https://www.racedepartment.com',87,true
FROM mods m, categories c, championships ch WHERE m.name='RSS Formula Hybrid 2024' AND c.name='Formula' AND ch.name='Formula 1 World Championship 2024';

INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'McLaren 720S — WRT #63', m.id, c.id, ch.id, 'WRT','','2023','Sim_Painter','https://www.racedepartment.com',64,true
FROM mods m, categories c, championships ch WHERE m.name='RSS GT3' AND c.name='GT' AND ch.name='Blancpain GT Series 2023';

INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'Mercedes AMG GT3 — HRT #5', m.id, c.id, ch.id, 'HRT','','2023','GT3_Skins','https://www.racedepartment.com',51,true
FROM mods m, categories c, championships ch WHERE m.name='RSS GT3' AND c.name='GT' AND ch.name='WEC GTE 2023';

INSERT INTO liveries (name, mod_id, category_id, championship_id, team, driver, season, author, download_url, upvotes, approved)
SELECT 'Monster Energy HC — #21', m.id, c.id, ch.id, 'Monster Energy','','2023','HillPainter','https://www.racedepartment.com',39,true
FROM mods m, categories c, championships ch WHERE m.name='RSS Hillclimb' AND c.name='Hillclimb' AND ch.name='Pikes Peak 2023';
