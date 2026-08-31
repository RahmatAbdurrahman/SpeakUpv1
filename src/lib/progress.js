import { supabase } from "./supabaseClient";

const SUB_SCORE_KEYS = ["fluency", "eye_contact", "kesesuaian_materi", "intonasi"];
const WEEKDAY_LABELS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]; // Date#getUTCDay(): 0 = Sunday
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta is fixed UTC+7, no DST

function average(nums) {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function toJakartaDateString(isoOrDate) {
  return new Date(new Date(isoOrDate).getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

function addDaysToDateString(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Current streak length in days — same definition as the SQL
 * get_streak_reminder_candidates() uses server-side (distinct Asia/Jakarta
 * calendar days with >=1 completed feedback, consecutive run). That RPC
 * only surfaces users whose streak ended exactly yesterday (about to break);
 * this instead walks back from "today" so it also counts a streak the user
 * has already extended today.
 */
function computeStreakCount(practiceDays, todayJakarta) {
  let cursor = practiceDays.has(todayJakarta) ? todayJakarta : addDaysToDateString(todayJakarta, -1);
  let count = 0;
  while (practiceDays.has(cursor)) {
    count++;
    cursor = addDaysToDateString(cursor, -1);
  }
  return count;
}

/**
 * Streak count + a 7-day (today and the 6 before it) active/inactive strip,
 * for the Home streak card. Derived from simulation_feedback.created_at —
 * a day only counts once a session actually got AI feedback, matching the
 * rest of the Progress screen's "finished" definition.
 */
export async function fetchStreakSummary(userId) {
  const { data, error } = await supabase
    .from("simulation_feedback")
    .select("created_at, simulation_sessions!inner(simulations!inner(user_id))")
    .eq("simulation_sessions.simulations.user_id", userId);
  if (error) throw error;

  const practiceDays = new Set((data ?? []).map((row) => toJakartaDateString(row.created_at)));
  const todayJakarta = toJakartaDateString(new Date());

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDaysToDateString(todayJakarta, -i);
    days.push({
      date: dateStr,
      label: WEEKDAY_LABELS_ID[new Date(`${dateStr}T00:00:00Z`).getUTCDay()],
      active: practiceDays.has(dateStr),
      today: dateStr === todayJakarta,
    });
  }

  return { count: computeStreakCount(practiceDays, todayJakarta), days };
}

/**
 * XP has no backend definition anywhere — no column, no award logic, no
 * trigger (checked pg_proc + every public column for %xp%: zero matches).
 * This is a display-only formula computed from real session data each load,
 * not a stored/persisted value: (sesi selesai x 50) + (skor rata-rata x 2).
 */
export async function fetchXp(userId) {
  const { data, error, count } = await supabase
    .from("simulation_sessions")
    .select("simulation_feedback!inner(skor), simulations!inner(user_id)", { count: "exact" })
    .eq("simulations.user_id", userId)
    .eq("session_status", "completed");
  if (error) throw error;

  const skorList = (data ?? []).map((r) => r.simulation_feedback?.skor).filter((n) => typeof n === "number");
  const avgSkor = skorList.length > 0 ? skorList.reduce((a, b) => a + b, 0) / skorList.length : 0;
  const totalSesi = count ?? data?.length ?? 0;

  return Math.round(totalSesi * 50 + avgSkor * 2);
}

/**
 * Aggregates the "Progress" tab: Speaking DNA (the daily snapshot
 * generate-feedback writes per TASK-H1 — avg of the last 5 session scores),
 * overall + sub-score averages, and recent session history. All computed
 * client-side from rows the user already owns under RLS — no new RPC or
 * migration needed.
 *
 * simulation_feedback uses !inner: session_status can be "completed" while
 * analyze-session succeeded but the generate-feedback call after it failed
 * (e.g. Gemini 503) or hasn't run yet — that session never got a feedback
 * row. Those don't count as a finished session anywhere on this screen.
 */
export async function fetchProgressSummary(userId) {
  const [{ data: dnaHistory, error: dnaErr }, { data: sessions, error: sessionsErr, count }] = await Promise.all([
    supabase
      .from("speaking_dna_history")
      .select("tanggal_snapshot, agregat_skor")
      .eq("user_id", userId)
      .order("tanggal_snapshot", { ascending: false })
      .limit(7),
    supabase
      .from("simulation_sessions")
      .select(
        // simulation_feedback stays !inner on purpose (per decision: Riwayat
        // Sesi only shows sessions the user actually finished — i.e. got a
        // real feedback row back). A session that was recorded but never
        // analysed (Gemini 503, generate-feedback failed, or a pre-Tahap-2
        // Live Presentation test row with no recording at all) simply never
        // shows up here — it wasn't a "sesi berhasil". live_rooms/peer_feedback
        // stay optional embeds purely for the Live badge + rating hint; they
        // have no unique constraint on session_id, so Supabase treats both as
        // one-to-many and returns arrays, not objects.
        "id, started_at, simulations!inner(kategori, user_id), simulation_feedback!inner(skor, sub_scores), live_rooms(id), peer_feedback(stars)",
        { count: "exact" },
      )
      .eq("simulations.user_id", userId)
      .eq("session_status", "completed")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  if (dnaErr) throw dnaErr;
  if (sessionsErr) throw sessionsErr;

  const feedbackRows = (sessions ?? []).map((s) => s.simulation_feedback).filter(Boolean);
  const avgSkor = average(feedbackRows.map((f) => f.skor).filter((n) => typeof n === "number"));
  const avgSubScores = {};
  for (const key of SUB_SCORE_KEYS) {
    avgSubScores[key] = average(feedbackRows.map((f) => f.sub_scores?.[key]).filter((n) => typeof n === "number"));
  }

  return {
    totalSesi: count ?? sessions?.length ?? 0,
    // Snapshot table is the source of truth once it has a row; before a
    // user's first daily snapshot exists, fall back to the same live
    // average generate-feedback would have written, so the number shown
    // isn't fabricated — it's the identical formula, just computed now
    // instead of at last-session-end.
    dnaScore: dnaHistory?.[0]?.agregat_skor ?? avgSkor,
    dnaTrend: (dnaHistory ?? []).slice().reverse(),
    avgSkor,
    avgSubScores,
    recentSessions: (sessions ?? []).map((s) => {
      const peerRows = Array.isArray(s.peer_feedback) ? s.peer_feedback : [];
      return {
        id: s.id,
        date: s.started_at,
        kategori: s.simulations?.kategori ?? null,
        skor: s.simulation_feedback?.skor ?? null,
        isLive: Array.isArray(s.live_rooms) && s.live_rooms.length > 0,
        peerRatingCount: peerRows.length,
        peerAvgStars: peerRows.length > 0 ? peerRows.reduce((sum, r) => sum + r.stars, 0) / peerRows.length : null,
      };
    }),
  };
}
