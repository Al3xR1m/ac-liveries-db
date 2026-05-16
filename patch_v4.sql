-- ============================================
-- AC LIVERIES DB — Patch v4
-- Adds: downvote function, paid/free field
-- Run in Supabase > SQL Editor
-- ============================================

-- Add paid field to liveries
ALTER TABLE liveries ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Downvote function (removes vote, decrements counter)
CREATE OR REPLACE FUNCTION remove_upvote(livery_id uuid, browser_fp text)
RETURNS void AS $$
BEGIN
  DELETE FROM votes WHERE votes.livery_id = livery_id AND votes.fingerprint = browser_fp;
  UPDATE liveries SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = livery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
