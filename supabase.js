// ============================================
// AC LIVERIES DB — Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://nfwxckigiyolqugrbssk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3hja2lnaXlvbHF1Z3Jic3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTc5MjAsImV4cCI6MjA5MzkzMzkyMH0.78oc3ROQkj44h6pycwbAfV8uIXtMPIg5LtTVM80hyGE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Browser fingerprint (anti-duplicate vote) ----
function getFingerprint() {
  let fp = localStorage.getItem('acliveries_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('acliveries_fp', fp);
  }
  return fp;
}

// ---- Voted liveries cache ----
function getVotedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('acliveries_voted') || '[]')); }
  catch { return new Set(); }
}
function addVoted(id) {
  const s = getVotedSet(); s.add(id);
  localStorage.setItem('acliveries_voted', JSON.stringify([...s]));
}

// ---- LIVERIES ----
async function fetchLiveries({ category, search, sort } = {}) {
  let q = db.from('liveries').select('*').eq('approved', true);
  if (category && category !== 'all') q = q.eq('category', category);
  if (search) q = q.or(`name.ilike.%${search}%,team.ilike.%${search}%,author.ilike.%${search}%,driver.ilike.%${search}%`);
  if (sort === 'votes') q = q.order('upvotes', { ascending: false });
  else if (sort === 'newest') q = q.order('created_at', { ascending: false });
  else q = q.order('name', { ascending: true });
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data;
}

async function fetchLivery(id) {
  const { data, error } = await db.from('liveries').select('*').eq('id', id).eq('approved', true).single();
  if (error) { console.error(error); return null; }
  return data;
}

async function submitLivery(payload) {
  const { error } = await db.from('liveries').insert([{ ...payload, approved: false }]);
  return !error;
}

async function upvoteLivery(id) {
  const fp = getFingerprint();
  const voted = getVotedSet();
  if (voted.has(id)) return false;
  const { error } = await db.rpc('increment_upvote', { livery_id: id, browser_fp: fp });
  if (!error) { addVoted(id); return true; }
  return false;
}

// ---- STATS ----
async function fetchStats() {
  const { data } = await db.from('liveries').select('id, mod, upvotes').eq('approved', true);
  if (!data) return { total: 0, mods: 0, votes: 0, top: '—' };
  const mods = new Set(data.map(l => l.mod)).size;
  const votes = data.reduce((s, l) => s + (l.upvotes || 0), 0);
  const top = data.reduce((a, b) => (b.upvotes > a.upvotes ? b : a), data[0]);
  return { total: data.length, mods, votes, top: top ? top.upvotes + ' votes' : '—' };
}
