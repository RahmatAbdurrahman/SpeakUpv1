import { supabase, invokeFunction } from "./supabaseClient";

// q1's TagsMultiInput stores option ids ("kuliah"), not labels — but
// situasi_cemas's real content is the full Indonesian phrase ("Presentasi
// kelas/kuliah"). Keep this in sync with DEFAULT_QUESTIONS.q1.options in
// Questionnaires.jsx.
const Q1_ID_TO_LABEL = {
  kuliah: "Presentasi kelas/kuliah",
  lomba: "Pitching lomba",
  kantor: "Rapat atau kerjaan kantor",
  interview: "Interview kerja atau beasiswa",
  networking: "Networking & kenalan orang baru",
  mc: "MC atau public speaking formal",
  other: "Yang lain...",
};

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Maps Questionnaires answers (keyed q1..q6, see DEFAULT_QUESTIONS in
 * Questionnaires.jsx) to the subset of `profiles` columns they correspond to.
 *
 * q1 (tags_multi: "Presentasi kelas/kuliah", "Pitching lomba", ...) matches
 * real profiles rows' situasi_cemas examples exactly — mapped here for the
 * Sosial recommendation badge (fetchLiveRooms' overlap check).
 *
 * q4/q5/q6 are still intentionally left unmapped — their wording doesn't
 * match `minat`'s real content ("Teknologi", "Gaming", ...), and mapping
 * them would silently write mismatched data until that's confirmed.
 */
export function mapAnswersToProfileUpdates(answers) {
  const updates = {};
  if (Array.isArray(answers.q1)) {
    updates.situasi_cemas = answers.q1.map((id) => Q1_ID_TO_LABEL[id]).filter(Boolean);
  }
  if (typeof answers.q3 === "number") {
    updates.skala_gugup_awal = answers.q3;
  }
  return updates;
}

/**
 * Deletes the caller's own account (PII, recordings, storage files — see
 * the delete-account function for what cascades automatically vs what it
 * removes manually). Irreversible. Does NOT sign out locally — call
 * supabase.auth.signOut() afterwards so App's onAuthStateChange resets the
 * screen the same way a normal logout does.
 */
export async function deleteAccount() {
  await invokeFunction("delete-account", {});
}

export function friendlyProfileError(error) {
  const msg = error?.message || "";
  if (/duplicate key|already exists|unique constraint/i.test(msg)) {
    return "Username sudah dipakai orang lain. Coba yang lain.";
  }
  return msg || "Terjadi kesalahan. Coba lagi.";
}

export function friendlyAuthError(error) {
  const msg = error?.message || "";
  if (/already registered|already exists|user_repeated_signup/i.test(msg)) {
    return "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "Email atau kata sandi salah.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Email belum dikonfirmasi. Cek inbox kamu dulu, ya.";
  }
  if (/password.*(least|weak|short|characters)/i.test(msg)) {
    return "Kata sandi terlalu lemah. Minimal 6 karakter.";
  }
  if (/invalid/i.test(msg) && /email/i.test(msg)) {
    return "Format email tidak valid atau ditolak server. Coba pakai email lain.";
  }
  if (/rate limit/i.test(msg)) {
    return "Terlalu banyak percobaan. Coba lagi sebentar lagi.";
  }
  return msg || "Terjadi kesalahan. Coba lagi.";
}

const PENDING_ONBOARDING_KEY = "speakup_pending_onboarding";

/**
 * Holds { name, answers } across the "check your email to confirm" gap,
 * for when Supabase Auth has email confirmation required — the profiles
 * update can't happen until the user actually has a session again.
 */
export function stashPendingOnboarding(payload) {
  try {
    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (e.g. private mode) — non-fatal, just skip.
  }
}

export function readPendingOnboarding() {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingOnboarding() {
  try {
    localStorage.removeItem(PENDING_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}
