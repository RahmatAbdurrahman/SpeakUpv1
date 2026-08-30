import { supabase, invokeFunction } from "./supabaseClient";

/**
 * "Sosial" tab — same real tables the Flutter app used: weekly leaderboard,
 * browsable live rooms, skill-matched "Match Partner" queue, and a friends
 * request/accept system (`friends` table + RPCs — added this round, no
 * table for this existed before). No Figma design exists for this screen
 * (checked directly), so the UI is modeled on the existing Live-tab cards
 * (see PracticeZone.jsx) which *did* come from Figma, plus the already-built
 * LiveRoomScreen.jsx call UI.
 */

export async function fetchLeaderboard() {
  const { data, error } = await supabase.rpc("get_weekly_leaderboard");
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const xp =
        typeof row.xp === "number"
          ? row.xp
          : Math.round((row.sesi_count || 0) * 50 + (row.avg_skor || 0) * 2);
      return {
        ...row,
        xp,
      };
    })
    .sort((a, b) => b.xp - a.xp);
}

export async function fetchLiveRooms() {
  const { data: rooms, error } = await supabase
    .from("live_rooms")
    .select("id, viewer_count, status, created_at, host_id, session_id, current_presenter_id")
    .eq("status", "live")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rooms || rooms.length === 0) return [];

  const hostIds = [...new Set(rooms.map((r) => r.host_id))];
  const sessionIds = [...new Set(rooms.map((r) => r.session_id))];

  const [{ data: profiles }, { data: sessions }, { data: me }] = await Promise.all([
    supabase.from("profiles").select("id, nama_panggilan, username, situasi_cemas").in("id", hostIds),
    supabase.from("simulation_sessions").select("id, simulations(kategori)").in("id", sessionIds),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("situasi_cemas").eq("id", user.id).single();
      return data;
    }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));
  const mySituasi = new Set(me?.situasi_cemas ?? []);

  return rooms.map((r) => {
    const host = profileMap.get(r.host_id);
    const session = sessionMap.get(r.session_id);
    // UI-only hint (badge di kartu Live Room) — irisan situasi_cemas host vs
    // diri sendiri, TIDAK mengubah urutan/algoritma matching join_match_queue.
    const matchedSituasi = (host?.situasi_cemas ?? []).filter((s) => mySituasi.has(s));
    return {
      id: r.id,
      hostId: r.host_id,
      sessionId: r.session_id,
      viewerCount: r.viewer_count,
      createdAt: r.created_at,
      hostName: host?.nama_panggilan || host?.username || "Pengguna",
      kategori: session?.simulations?.kategori ?? null,
      recommended: matchedSituasi.length > 0,
    };
  });
}

/**
 * Makes a just-finished solo simulation session visible in "Live Sekarang".
 * RLS (live_rooms_insert_own_not_minor) already enforces host_id = auth.uid()
 * and blocks minors — no RPC needed for this direct insert.
 */
export async function goLive(sessionId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("live_rooms")
    .insert({ session_id: sessionId, host_id: user.id, status: "live" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a brand new live presentation room from the Sosial screen,
 * making it immediately joinable by everyone in "Live Sekarang".
 */
export async function createLivePresentationRoom(kategori = "kelas") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi pengguna tidak ditemukan");

  // 1. Create a simulation record
  const { data: sim, error: simErr } = await supabase
    .from("simulations")
    .insert({ user_id: user.id, kategori, status: "in_progress" })
    .select()
    .single();
  if (simErr) throw simErr;

  // 2. Create simulation_sessions record
  const { data: session, error: sessErr } = await supabase
    .from("simulation_sessions")
    .insert({ simulation_id: sim.id, session_status: "completed" })
    .select()
    .single();
  if (sessErr) throw sessErr;

  // 3. Create live_rooms record
  const { data: room, error: roomErr } = await supabase
    .from("live_rooms")
    .insert({ session_id: session.id, host_id: user.id, status: "live" })
    .select()
    .single();
  if (roomErr) throw roomErr;

  // Get user display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_panggilan, username")
    .eq("id", user.id)
    .maybeSingle();

  const hostName = profile?.nama_panggilan || profile?.username || "Kamu";

  return {
    roomId: room.id,
    hostId: user.id,
    sessionId: session.id,
    title: `Live Presentasi: ${hostName}`,
    hostName,
    isHost: true,
  };
}

/**
 * Flips a room back out of "Live Sekarang" once its host leaves. Without
 * this, a room inserted by goLive() stays status='live' forever (nothing
 * else ever wrote to it) and keeps showing in fetchLiveRooms() long after
 * the host's session ended — call this from the host's own leave action,
 * never from a viewer leaving (other viewers may still be watching).
 */
export async function endLiveRoom(roomId) {
  const { error } = await supabase.from("live_rooms").update({ status: "ended" }).eq("id", roomId);
  if (error) throw error;
}

/** role: 'broadcaster' | 'viewer' — see get-live-token for the authorization rules. */
export async function requestLiveToken(roomId, role) {
  return invokeFunction("get-live-token", { room_id: roomId, role });
}

// {matched, room_id?, session_id?, partner_id?, partner_nama?, goes_first?} or {matched:false}
export async function joinMatchQueue() {
  const { data, error } = await supabase.rpc("join_match_queue");
  if (error) throw error;
  return data;
}

export async function inviteByUsername(username) {
  const { data, error } = await supabase.rpc("invite_partner_by_username", { p_username: username });
  if (error) throw error;
  return data;
}

export async function cancelMatchQueue(userId) {
  const { error } = await supabase.from("match_queue").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function fetchOwnQueueStatus(userId) {
  const { data, error } = await supabase.from("match_queue").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Keeps a "Live Sekarang" list fresh while its screen stays mounted — without
 * this, a screen that was already open when a room went live or ended only
 * ever saw the snapshot from its initial fetchLiveRooms() call. Fires
 * onChange() on ANY insert/update/delete in live_rooms (a host going live,
 * ending their room via endLiveRoom, etc.) so the caller can just re-run
 * fetchLiveRooms(). Returns an unsubscribe fn.
 */
export function subscribeToLiveRooms(onChange) {
  const channel = supabase
    .channel("live_rooms_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "live_rooms" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Calls onMatched(row) once this user's queue row flips to 'matched'. Returns an unsubscribe fn. */
export function subscribeToMatchQueue(userId, onMatched) {
  const channel = supabase
    .channel(`match_queue_${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "match_queue", filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.new?.status === "matched") onMatched(payload.new);
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function fetchLiveQuestions(roomId) {
  const { data: questions, error } = await supabase
    .from("live_questions")
    .select("id, asker_id, pertanyaan, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!questions || questions.length === 0) return [];

  const askerIds = [...new Set(questions.map((q) => q.asker_id).filter(Boolean))];
  let profileMap = new Map();
  if (askerIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, nama_panggilan, username").in("id", askerIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  return questions.map((q) => ({
    id: q.id,
    text: q.pertanyaan,
    createdAt: q.created_at,
    authorName: q.asker_id
      ? profileMap.get(q.asker_id)?.nama_panggilan || profileMap.get(q.asker_id)?.username || "Pengguna"
      : "Anonim",
  }));
}

export async function postLiveQuestion(roomId, text) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("live_questions")
    .insert({ room_id: roomId, pertanyaan: text, asker_id: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToLiveQuestions(roomId, onChange) {
  const channel = supabase
    .channel(`live_questions_${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_questions", filter: `room_id=eq.${roomId}` },
      () => onChange()
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── Friends (request/accept) ───────────────────────────────────────────────

export async function sendFriendRequest(username) {
  const { data, error } = await supabase.rpc("send_friend_request", { p_username: username });
  if (error) throw error;
  return data;
}

export async function respondFriendRequest(requestId, accept) {
  const { error } = await supabase.rpc("respond_friend_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function fetchFriends(userId) {
  const { data, error } = await supabase
    .from("friends")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const friendIds = data.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nama_panggilan, username")
    .in("id", friendIds);

  return (profiles ?? []).map((p) => ({ id: p.id, name: p.nama_panggilan || p.username || "Pengguna" }));
}

export async function fetchIncomingFriendRequests(userId) {
  const { data, error } = await supabase
    .from("friends")
    .select("id, requester_id, created_at")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const ids = data.map((r) => r.requester_id);
  const { data: profiles } = await supabase.from("profiles").select("id, nama_panggilan, username").in("id", ids);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((r) => ({
    requestId: r.id,
    fromName: profileMap.get(r.requester_id)?.nama_panggilan || profileMap.get(r.requester_id)?.username || "Pengguna",
  }));
}

export function friendlySosialError(error) {
  const msg = error?.message || "";
  // The RPCs already raise clear Indonesian messages (age gate, blocked user,
  // username not found, etc.) — pass those through as-is.
  if (msg) return msg;
  return "Terjadi kesalahan. Coba lagi.";
}
