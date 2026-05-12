// ============================================
// AC LIVERIES DB — Supabase Configuration v2
// ============================================

const SUPABASE_URL = 'https://nfwxckigiyolqugrbssk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3hja2lnaXlvbHF1Z3Jic3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTc5MjAsImV4cCI6MjA5MzkzMzkyMH0.78oc3ROQkj44h6pycwbAfV8uIXtMPIg5LtTVM80hyGE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Browser fingerprint ----
function getFingerprint() {
  let fp = localStorage.getItem('acliveries_fp');
  if (!fp) { fp = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('acliveries_fp', fp); }
  return fp;
}
function getVotedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('acliveries_voted') || '[]')); } catch { return new Set(); }
}
function addVoted(id) {
  const s = getVotedSet(); s.add(id); localStorage.setItem('acliveries_voted', JSON.stringify([...s]));
}

// ============================================
// CATEGORIES
// ============================================
async function fetchCategories() {
  const { data } = await db.from('categories').select('*').order('name');
  return data || [];
}
async function createCategory(payload) {
  const { error } = await db.from('categories').insert([payload]); return !error;
}
async function updateCategory(id, payload) {
  const { error } = await db.from('categories').update(payload).eq('id', id); return !error;
}
async function deleteCategory(id) {
  const { error } = await db.from('categories').delete().eq('id', id); return !error;
}

// ============================================
// MODS
// ============================================
async function fetchMods() {
  const { data } = await db.from('mods').select('*, categories(name, color_bg, color_text)').order('name');
  return data || [];
}
async function createMod(payload) {
  const { error } = await db.from('mods').insert([payload]); return !error;
}
async function updateMod(id, payload) {
  const { error } = await db.from('mods').update(payload).eq('id', id); return !error;
}
async function deleteMod(id) {
  const { error } = await db.from('mods').delete().eq('id', id); return !error;
}

// ============================================
// CHAMPIONSHIPS
// ============================================
async function fetchChampionships() {
  const { data } = await db.from('championships').select('*, mods(name)').order('name');
  return data || [];
}
async function createChampionship(payload) {
  const { error } = await db.from('championships').insert([payload]); return !error;
}
async function updateChampionship(id, payload) {
  const { error } = await db.from('championships').update(payload).eq('id', id); return !error;
}
async function deleteChampionship(id) {
  const { error } = await db.from('championships').delete().eq('id', id); return !error;
}

// ============================================
// LIVERIES
// ============================================
async function fetchLiveries({ categoryId, championshipId, modId, search, sort, approvedOnly = true } = {}) {
  let q = db.from('liveries').select('*, categories(name,color_bg,color_text), mods(name), championships(name,short_name)');
  if (approvedOnly) q = q.eq('approved', true);
  if (categoryId)     q = q.eq('category_id', categoryId);
  if (championshipId) q = q.eq('championship_id', championshipId);
  if (modId)          q = q.eq('mod_id', modId);
  if (search) q = q.or(`name.ilike.%${search}%,team.ilike.%${search}%,author.ilike.%${search}%,driver.ilike.%${search}%`);
  if (sort === 'votes')  q = q.order('upvotes', { ascending: false });
  else if (sort === 'newest') q = q.order('created_at', { ascending: false });
  else q = q.order('name', { ascending: true });
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data;
}

async function fetchLivery(id) {
  const { data } = await db.from('liveries').select('*, categories(name,color_bg,color_text), mods(name), championships(name,short_name)').eq('id', id).single();
  return data || null;
}

async function fetchPendingLiveries() {
  const { data } = await db.from('liveries').select('*, mods(name), categories(name)').eq('approved', false).order('created_at', { ascending: false });
  return data || [];
}

async function submitLivery(payload) {
  const { error } = await db.from('liveries').insert([{ ...payload, approved: false }]); return !error;
}

async function updateLivery(id, payload) {
  const { error } = await db.from('liveries').update(payload).eq('id', id); return !error;
}

async function deleteLivery(id) {
  const { error } = await db.from('liveries').delete().eq('id', id); return !error;
}

async function approveLivery(id) {
  return updateLivery(id, { approved: true });
}

async function rejectLivery(id) {
  return deleteLivery(id);
}

// ============================================
// UPVOTE
// ============================================
async function upvoteLivery(id) {
  const fp = getFingerprint();
  const voted = getVotedSet();
  if (voted.has(id)) return false;
  const { error } = await db.rpc('increment_upvote', { livery_id: id, browser_fp: fp });
  if (!error) { addVoted(id); return true; }
  return false;
}

// ============================================
// STATS
// ============================================
async function fetchStats() {
  const { data } = await db.from('liveries').select('id, mod_id, upvotes, name').eq('approved', true);
  if (!data) return { total: 0, mods: 0, votes: 0, top: '—' };
  const mods  = new Set(data.map(l => l.mod_id)).size;
  const votes = data.reduce((s, l) => s + (l.upvotes || 0), 0);
  const top   = data.reduce((a, b) => (b.upvotes > a.upvotes ? b : a), data[0]);
  return { total: data.length, mods, votes, top: top ? top.upvotes + ' votes' : '—' };
}

async function fetchAdminStats() {
  const [{ count: total }, { count: pending }, { count: totalVotes }] = await Promise.all([
    db.from('liveries').select('*', { count: 'exact', head: true }).eq('approved', true),
    db.from('liveries').select('*', { count: 'exact', head: true }).eq('approved', false),
    db.from('votes').select('*', { count: 'exact', head: true }),
  ]);
  return { total: total || 0, pending: pending || 0, totalVotes: totalVotes || 0 };
}
