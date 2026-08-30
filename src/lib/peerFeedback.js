import { supabase } from "./supabaseClient";

export const PEER_FEEDBACK_TAGS = [
  "Percaya Diri",
  "Jelas & Lugas",
  "Kontak Mata Bagus",
  "Intonasi Menarik",
  "Materi Relevan",
  "Perlu Lebih Rileks",
  "Kecepatan Pas",
  "Bahasa Tubuh Baik",
];

function summarize(rows) {
  if (!rows || rows.length === 0) return { avgStars: null, count: 0, topTags: [] };

  const avgStars = rows.reduce((sum, r) => sum + r.stars, 0) / rows.length;
  const tagCounts = new Map();
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return { avgStars, count: rows.length, topTags };
}

/** Terpisah total dari simulation_feedback (AI) — lihat komentar tabel peer_feedback. */
export async function submitPeerFeedback(sessionId, { stars, tags, comment }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("peer_feedback").insert({
    session_id: sessionId,
    rater_id: user.id,
    stars,
    tags: tags ?? [],
    comment: comment?.trim() || null,
  });
  if (error) throw error;
}

export async function fetchPeerFeedbackSummary(sessionId) {
  const { data, error } = await supabase.from("peer_feedback").select("stars, tags").eq("session_id", sessionId);
  if (error) throw error;
  return summarize(data);
}

/** Individual ratings for one session, newest first — for the dedicated "Lihat Feedback dari Viewer" page. */
export async function fetchPeerFeedbackEntries(sessionId) {
  const { data, error } = await supabase
    .from("peer_feedback")
    .select("id, rater_id, stars, tags, comment, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const raterIds = [...new Set(data.map((r) => r.rater_id).filter(Boolean))];
  let profileMap = new Map();
  if (raterIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, nama_panggilan, username").in("id", raterIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  return data.map((r) => ({
    id: r.id,
    stars: r.stars,
    tags: r.tags ?? [],
    comment: r.comment,
    createdAt: r.created_at,
    raterName: profileMap.get(r.rater_id)?.nama_panggilan || profileMap.get(r.rater_id)?.username || "Penonton",
  }));
}

/** Aggregate rating across every session this user has ever presented — for the Progress dashboard. */
export async function fetchMyPeerRatingSummary(userId) {
  const { data, error } = await supabase
    .from("peer_feedback")
    .select("stars, tags, simulation_sessions!inner(simulations!inner(user_id))")
    .eq("simulation_sessions.simulations.user_id", userId);
  if (error) throw error;
  return summarize(data);
}

export function friendlyPeerFeedbackError(error) {
  const msg = error?.message || "";
  if (/duplicate key|unique constraint/i.test(msg)) return "Kamu sudah kasih rating buat sesi ini.";
  return msg || "Terjadi kesalahan. Coba lagi.";
}
