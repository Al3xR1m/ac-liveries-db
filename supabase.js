// ============================================
// AC LIVERIES DB — Supabase Configuration v5
// ============================================

const SUPABASE_URL = 'https://nfwxckigiyolqugrbssk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3hja2lnaXlvbHF1Z3Jic3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTc5MjAsImV4cCI6MjA5MzkzMzkyMH0.78oc3ROQkj44h6pycwbAfV8uIXtMPIg5LtTVM80hyGE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// FINGERPRINT & VOTES
// ============================================
function getFingerprint() {
  let fp = localStorage.getItem('acliveries_fp');
  if (!fp) { fp = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('acliveries_fp', fp); }
  return fp;
}
function getVotedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('acliveries_voted') || '[]')); } catch { return new Set(); }
}
function addVoted(id) { const s = getVotedSet(); s.add(id); localStorage.setItem('acliveries_voted', JSON.stringify([...s])); }
function removeVoted(id) { const s = getVotedSet(); s.delete(id); localStorage.setItem('acliveries_voted', JSON.stringify([...s])); }

// ============================================
// CATEGORIES
// ============================================
async function fetchCategories() {
  const { data } = await db.from('categories').select('*').order('name'); return data || [];
}
async function createCategory(p) { const { error } = await db.from('categories').insert([p]); return !error; }
async function updateCategory(id, p) { const { error } = await db.from('categories').update(p).eq('id', id); return !error; }
async function deleteCategory(id) { const { error } = await db.from('categories').delete().eq('id', id); return !error; }

// ============================================
// MODS
// ============================================
async function fetchMods() {
  const { data } = await db.from('mods').select('*, categories(name,color_bg,color_text)').order('name'); return data || [];
}
async function createMod(p) { const { error } = await db.from('mods').insert([p]); return !error; }
async function updateMod(id, p) { const { error } = await db.from('mods').update(p).eq('id', id); return !error; }
async function deleteMod(id) { const { error } = await db.from('mods').delete().eq('id', id); return !error; }

// ============================================
// CHAMPIONSHIPS
// ============================================
async function fetchChampionships() {
  const { data: champs } = await db.from('championships').select('*').order('name');
  if (!champs) return [];
  const { data: links } = await db.from('championship_categories').select('championship_id, category_id, categories(name,color_bg,color_text)');
  const linkMap = {};
  (links || []).forEach(l => { if (!linkMap[l.championship_id]) linkMap[l.championship_id] = []; linkMap[l.championship_id].push({ id: l.category_id, ...l.categories }); });
  return champs.map(ch => ({ ...ch, linked_categories: linkMap[ch.id] || [] }));
}
async function fetchChampionshipsByCategory(categoryIds) {
  if (!categoryIds?.length) return fetchChampionships();
  const { data: links } = await db.from('championship_categories').select('championship_id').in('category_id', categoryIds);
  if (!links?.length) return [];
  const champIds = [...new Set(links.map(l => l.championship_id))];
  const { data: champs } = await db.from('championships').select('*').in('id', champIds).order('name');
  if (!champs) return [];
  const { data: allLinks } = await db.from('championship_categories').select('championship_id, category_id, categories(name,color_bg,color_text)').in('championship_id', champIds);
  const linkMap = {};
  (allLinks || []).forEach(l => { if (!linkMap[l.championship_id]) linkMap[l.championship_id] = []; linkMap[l.championship_id].push({ id: l.category_id, ...l.categories }); });
  return champs.map(ch => ({ ...ch, linked_categories: linkMap[ch.id] || [] }));
}
async function createChampionship(payload, categoryIds = []) {
  const { data, error } = await db.from('championships').insert([payload]).select().single();
  if (error || !data) return false;
  if (categoryIds.length) await db.from('championship_categories').insert(categoryIds.map(cid => ({ championship_id: data.id, category_id: cid })));
  return true;
}
async function updateChampionship(id, payload, categoryIds = []) {
  const { error } = await db.from('championships').update(payload).eq('id', id);
  if (error) return false;
  await db.from('championship_categories').delete().eq('championship_id', id);
  if (categoryIds.length) await db.from('championship_categories').insert(categoryIds.map(cid => ({ championship_id: id, category_id: cid })));
  return true;
}
async function deleteChampionship(id) { const { error } = await db.from('championships').delete().eq('id', id); return !error; }

// ============================================
// ARTISTS
// ============================================
async function fetchArtists() {
  const { data } = await db.from('artists').select('*').order('name'); return data || [];
}
async function fetchArtist(id) {
  const { data } = await db.from('artists').select('*').eq('id', id).single(); return data || null;
}
async function createArtist(p) { const { error } = await db.from('artists').insert([p]); return !error; }
async function updateArtist(id, p) { const { error } = await db.from('artists').update(p).eq('id', id); return !error; }
async function deleteArtist(id) { const { error } = await db.from('artists').delete().eq('id', id); return !error; }

// Generate a random token and save it to the artist via RPC (bypasses RLS)
async function generateArtistToken(id) {
  const token = 'art_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(36)).join('').slice(0, 32);
  const { error } = await db.rpc('set_artist_token', { p_artist_id: id, p_token: token });
  return error ? null : token;
}

// Get artist + their liveries by token (for artist-edit page)
async function fetchArtistByToken(token) {
  const { data } = await db.from('artists').select('*').eq('edit_token', token).single();
  return data || null;
}
async function fetchLiveriesByToken(token) {
  // Get artist id from token first
  const artist = await fetchArtistByToken(token);
  if (!artist) return [];
  const { data } = await db.from('liveries')
    .select('*, mods(name), categories(name,color_bg,color_text), championships(name,short_name)')
    .eq('artist_id', artist.id)
    .eq('approved', true)
    .order('created_at', { ascending: false });
  return data || [];
}

// Update livery as artist (server validates token + ownership)
async function updateLiveryAsArtist(token, liveryId, payload) {
  const { data, error } = await db.rpc('update_livery_as_artist', {
    p_token:        token,
    p_livery_id:    liveryId,
    p_image_url:    payload.image_url    || null,
    p_download_url: payload.download_url || null,
    p_notes:        payload.notes        || null,
    p_is_paid:      payload.is_paid      || false,
    p_driver:       payload.driver       || null,
    p_team:         payload.team         || null,
  });
  if (error) { console.error(error); return false; }
  return data === true;
}

async function fetchArtistStats() {
  // Returns artists with livery count and total upvotes
  const { data: liveries } = await db.from('liveries').select('artist_id, upvotes').eq('approved', true).not('artist_id', 'is', null);
  const stats = {};
  (liveries || []).forEach(l => {
    if (!stats[l.artist_id]) stats[l.artist_id] = { count: 0, upvotes: 0 };
    stats[l.artist_id].count++;
    stats[l.artist_id].upvotes += l.upvotes || 0;
  });
  return stats;
}

// ============================================
// LIVERIES
// ============================================
async function fetchLiveries({ categoryId, championshipId, modId, artistId, search, sort, approvedOnly = true, isPaid } = {}) {
  let q = db.from('liveries').select('*, categories(name,color_bg,color_text), mods(name), championships(name,short_name), artists(id,name,avatar_url)');
  if (approvedOnly) q = q.eq('approved', true);
  if (categoryId)     q = q.eq('category_id', categoryId);
  if (championshipId) q = q.eq('championship_id', championshipId);
  if (modId)          q = q.eq('mod_id', modId);
  if (artistId)       q = q.eq('artist_id', artistId);
  if (isPaid === true)  q = q.eq('is_paid', true);
  if (isPaid === false) q = q.eq('is_paid', false);
  if (search) q = q.or(`name.ilike.%${search}%,team.ilike.%${search}%,author.ilike.%${search}%,driver.ilike.%${search}%`);
  if (sort === 'votes')       q = q.order('upvotes', { ascending: false });
  else if (sort === 'newest') q = q.order('created_at', { ascending: false });
  else                        q = q.order('name', { ascending: true });
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data;
}
async function fetchLivery(id) {
  const { data } = await db.from('liveries').select('*, categories(name,color_bg,color_text), mods(name), championships(name,short_name), artists(id,name,avatar_url)').eq('id', id).single();
  return data || null;
}
async function fetchPendingLiveries() {
  const { data } = await db.from('liveries').select('*, mods(name), categories(name,color_bg,color_text), championships(name,short_name), artists(name)').eq('approved', false).order('created_at', { ascending: false });
  return data || [];
}
async function submitLivery(payload) { const { error } = await db.from('liveries').insert([{ ...payload, approved: false }]); return !error; }
async function updateLivery(id, payload) { const { error } = await db.from('liveries').update(payload).eq('id', id); return !error; }
async function deleteLivery(id) { const { error } = await db.from('liveries').delete().eq('id', id); return !error; }
async function approveLivery(id) { return updateLivery(id, { approved: true }); }
async function rejectLivery(id) { return deleteLivery(id); }

// ============================================
// UPVOTE / REMOVE
// ============================================
async function upvoteLivery(id) {
  const fp = getFingerprint();
  if (getVotedSet().has(id)) return false;
  const { error } = await db.rpc('increment_upvote', { livery_id: id, browser_fp: fp });
  if (!error) { addVoted(id); return true; }
  return false;
}
async function removeUpvoteLivery(id) {
  const fp = getFingerprint();
  if (!getVotedSet().has(id)) return false;
  const { error } = await db.rpc('remove_upvote', { p_livery_id: id, browser_fp: fp });
  if (!error) { removeVoted(id); return true; }
  return false;
}

// ============================================
// REPORTS
// ============================================
async function reportLivery(liveryId, reason = 'broken_link') {
  const { error } = await db.from('reports').insert([{ livery_id: liveryId, reason }]); return !error;
}
async function fetchReports() {
  const { data } = await db.from('reports').select('*, liveries(id,name,download_url)').eq('resolved', false).order('created_at', { ascending: false });
  return data || [];
}
async function resolveReport(id) {
  const { error } = await db.from('reports').update({ resolved: true }).eq('id', id); return !error;
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
  const [{ count: total }, { count: pending }, { count: totalVotes }, { count: openReports }] = await Promise.all([
    db.from('liveries').select('*', { count: 'exact', head: true }).eq('approved', true),
    db.from('liveries').select('*', { count: 'exact', head: true }).eq('approved', false),
    db.from('votes').select('*', { count: 'exact', head: true }),
    db.from('reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
  ]);
  return { total: total || 0, pending: pending || 0, totalVotes: totalVotes || 0, openReports: openReports || 0 };
}
