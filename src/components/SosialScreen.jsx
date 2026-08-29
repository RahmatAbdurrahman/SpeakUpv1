import React, { useEffect, useRef, useState } from "react";
import "./SosialScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import { supabase } from "../lib/supabaseClient";
import {
  fetchLeaderboard,
  fetchLiveRooms,
  joinMatchQueue,
  cancelMatchQueue,
  subscribeToMatchQueue,
  subscribeToLiveRooms,
  fetchFriends,
  fetchIncomingFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  friendlySosialError,
} from "../lib/sosial";
import { fetchXp } from "../lib/progress";

const KATEGORI_LABEL = {
  spontan: "Spontaneous",
  kelas: "Presentasi",
  lomba: "Presentasi",
  interview: "Interview",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  return `${Math.round(mins / 60)} jam lalu`;
}

export default function SosialScreen({ onNavigateHome, onNavigateSimulasi, onNavigateProfile, onJoinRoom }) {
  const [userId, setUserId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveRooms, setLiveRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [queueState, setQueueState] = useState("idle"); // idle | waiting | matching
  const [friendUsername, setFriendUsername] = useState("");
  const [friendActionMessage, setFriendActionMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [xp, setXp] = useState(0);
  const unsubscribeRef = useRef(null);

  const reloadFriends = async (uid) => {
    const [friendsResult, incomingResult] = await Promise.allSettled([
      fetchFriends(uid),
      fetchIncomingFriendRequests(uid),
    ]);
    if (friendsResult.status === "fulfilled") setFriends(friendsResult.value);
    if (incomingResult.status === "fulfilled") setIncomingRequests(incomingResult.value);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);

      // Settled independently — a failure loading one section (e.g. a
      // permissions hiccup on the leaderboard RPC) shouldn't blank out the
      // other sections if they succeeded.
      const tasks = [fetchLeaderboard(), fetchLiveRooms()];
      if (user?.id) tasks.push(fetchFriends(user.id), fetchIncomingFriendRequests(user.id), fetchXp(user.id));
      const results = await Promise.allSettled(tasks);
      if (!active) return;

      const [boardResult, roomsResult, friendsResult, incomingResult, xpResult] = results;
      if (boardResult.status === "fulfilled") setLeaderboard(boardResult.value);
      if (roomsResult.status === "fulfilled") setLiveRooms(roomsResult.value);
      if (friendsResult?.status === "fulfilled") setFriends(friendsResult.value);
      if (incomingResult?.status === "fulfilled") setIncomingRequests(incomingResult.value);
      if (xpResult?.status === "fulfilled") setXp(xpResult.value);

      const firstError = results.find((r) => r.status === "rejected");
      if (firstError) setErrorMessage(friendlySosialError(firstError.reason));

      setLoading(false);
    })();

    return () => {
      active = false;
      unsubscribeRef.current?.();
    };
  }, []);

  // Keeps "Live Sekarang" correct while this screen stays open — otherwise
  // it only ever reflects the one-time fetchLiveRooms() snapshot above from
  // when the screen mounted. The realtime subscription catches a NEW room
  // going live instantly; it can't be relied on for a room ENDING though —
  // live_rooms' own SELECT policy is (status='live' OR host_id=auth.uid()),
  // so once a host's room flips to 'ended' it stops matching a non-host
  // viewer's row-level access and Realtime simply never delivers that
  // update to them. The periodic refetch is what actually guarantees an
  // ended room disappears from a browsing viewer's already-open list.
  useEffect(() => {
    const reloadRooms = () => {
      fetchLiveRooms()
        .then(setLiveRooms)
        .catch(() => {});
    };
    const unsubscribeRealtime = subscribeToLiveRooms(reloadRooms);
    const pollId = setInterval(reloadRooms, 20000);
    return () => {
      unsubscribeRealtime();
      clearInterval(pollId);
    };
  }, []);

  const handleMatched = (row) => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setQueueState("idle");
    onJoinRoom?.({
      roomId: row.room_id,
      title: `Latihan bareng ${row.partner_nama || "Partner"}`,
      hostName: row.partner_nama || "Partner",
    });
  };

  const handleFindPartner = async () => {
    setErrorMessage("");
    setQueueState("matching");
    try {
      const result = await joinMatchQueue();
      if (result?.matched) {
        handleMatched(result);
        return;
      }
      // No one waiting right now — sit in the queue and listen for a match.
      setQueueState("waiting");
      if (userId) {
        unsubscribeRef.current = subscribeToMatchQueue(userId, handleMatched);
      }
    } catch (err) {
      setErrorMessage(friendlySosialError(err));
      setQueueState("idle");
    }
  };

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    const username = friendUsername.trim();
    if (!username || sendingRequest) return;

    setFriendActionMessage("");
    setSendingRequest(true);
    try {
      const result = await sendFriendRequest(username);
      setFriendUsername("");
      setFriendActionMessage(`Permintaan terkirim ke ${result?.friend_nama || username}.`);
    } catch (err) {
      setFriendActionMessage(friendlySosialError(err));
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId, accept) => {
    try {
      await respondFriendRequest(requestId, accept);
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      if (accept && userId) reloadFriends(userId);
    } catch (err) {
      setFriendActionMessage(friendlySosialError(err));
    }
  };

  const handleCancelQueue = async () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setQueueState("idle");
    if (userId) {
      try {
        await cancelMatchQueue(userId);
      } catch {
        // best-effort — row will just sit as 'waiting' if this fails, harmless
      }
    }
  };

  return (
    <div className="sosial-screen" data-name="Sosial">
      <div className="sosial-topbar">
        <h1 className="sosial-topbar-title">Sosial</h1>
        <div className="sosial-xp-badge">
          <span>{xp.toLocaleString("id-ID")} XP</span>
        </div>
      </div>

      <div className="sosial-scroll-body">
        {errorMessage && <p className="sosial-error-banner">{errorMessage}</p>}

        {/* ── Match Partner ─────────────────────────────────────── */}
        <section className="sosial-section">
          <div className="sosial-match-card">
            <div className="sosial-match-text">
              <h3>Cari Partner Latihan</h3>
              <p>Dipasangkan otomatis dengan orang lain yang levelnya mirip kamu, buat latihan duet.</p>
            </div>
            {queueState === "idle" && (
              <button type="button" className="btn-sosial-match" onClick={handleFindPartner}>
                Cari Partner
              </button>
            )}
            {queueState === "matching" && (
              <button type="button" className="btn-sosial-match" disabled>
                Mencari...
              </button>
            )}
            {queueState === "waiting" && (
              <div className="sosial-waiting-row">
                <span className="sosial-waiting-spinner" />
                <span className="sosial-waiting-text">Nunggu partner...</span>
                <button type="button" className="btn-sosial-cancel" onClick={handleCancelQueue}>
                  Batal
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Teman ─────────────────────────────────────────────── */}
        <section className="sosial-section">
          <h2 className="sosial-section-title">Teman</h2>

          <form className="sosial-add-friend-row" onSubmit={handleSendFriendRequest}>
            <input
              type="text"
              className="sosial-add-friend-input"
              placeholder="Tambah teman via username"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
            />
            <button type="submit" className="btn-sosial-add-friend" disabled={!friendUsername.trim() || sendingRequest}>
              {sendingRequest ? "..." : "Tambah"}
            </button>
          </form>
          {friendActionMessage && <p className="sosial-hint-text">{friendActionMessage}</p>}

          {incomingRequests.length > 0 && (
            <div className="sosial-request-list">
              {incomingRequests.map((req) => (
                <div key={req.requestId} className="sosial-request-row">
                  <span className="sosial-request-name">{req.fromName} ingin berteman</span>
                  <div className="sosial-request-actions">
                    <button type="button" className="btn-sosial-accept" onClick={() => handleRespondRequest(req.requestId, true)}>
                      Terima
                    </button>
                    <button type="button" className="btn-sosial-decline" onClick={() => handleRespondRequest(req.requestId, false)}>
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && friends.length === 0 && (
            <p className="sosial-hint-text">Belum ada teman. Tambah lewat username di atas.</p>
          )}
          <div className="sosial-friend-list">
            {friends.map((friend) => {
              const liveRoom = liveRooms.find((r) => r.hostId === friend.id);
              return (
                <div key={friend.id} className="sosial-friend-row">
                  <span className="sosial-friend-name">{friend.name}</span>
                  {liveRoom ? (
                    <button
                      type="button"
                      className="btn-sosial-friend-live"
                      onClick={() =>
                        onJoinRoom?.({ roomId: liveRoom.id, hostId: liveRoom.hostId, sessionId: liveRoom.sessionId, title: `Live: ${friend.name}`, hostName: friend.name })
                      }
                    >
                      🔴 Live — Gabung
                    </button>
                  ) : (
                    <span className="sosial-friend-offline">Belum live</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Live Rooms ────────────────────────────────────────── */}
        <section className="sosial-section">
          <h2 className="sosial-section-title">Live Sekarang</h2>
          {loading && <p className="sosial-hint-text">Memuat...</p>}
          {!loading && liveRooms.length === 0 && (
            <p className="sosial-hint-text">Belum ada yang live saat ini.</p>
          )}
          <div className="sosial-live-list">
            {liveRooms.map((room) => (
              <div key={room.id} className="sosial-live-card">
                <div className="sosial-live-card-meta">
                  <span className="sosial-live-badge">🔴 LIVE</span>
                  <span className="sosial-live-kategori">{KATEGORI_LABEL[room.kategori] || "Latihan"}</span>
                  {room.recommended && <span className="sosial-live-recommended">✨ Cocok buat kamu</span>}
                </div>
                <h3 className="sosial-live-host">{room.hostName}</h3>
                <div className="sosial-live-stats-row">
                  <span className="sosial-live-stat">
                    <img src={iconGroup} alt="" className="sosial-live-stat-icon" />
                    {room.viewerCount} Penonton
                  </span>
                  <span className="sosial-live-stat">{timeAgo(room.createdAt)}</span>
                </div>
                <button
                  type="button"
                  className="btn-sosial-join"
                  onClick={() =>
                    onJoinRoom?.({ roomId: room.id, hostId: room.hostId, sessionId: room.sessionId, title: `Live: ${room.hostName}`, hostName: room.hostName })
                  }
                >
                  Gabung
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Leaderboard ───────────────────────────────────────── */}
        <section className="sosial-section">
          <h2 className="sosial-section-title">Papan Peringkat Minggu Ini</h2>
          {loading && <p className="sosial-hint-text">Memuat...</p>}
          {!loading && leaderboard.length === 0 && (
            <p className="sosial-hint-text">Belum ada data minggu ini — mulai latihan buat masuk peringkat!</p>
          )}
          <div className="sosial-leaderboard-list">
            {leaderboard.map((row, i) => (
              <div
                key={row.user_id}
                className={`sosial-leaderboard-row ${row.user_id === userId ? "sosial-leaderboard-row--me" : ""}`}
              >
                <span className="sosial-rank">{i + 1}</span>
                <span className="sosial-lb-name">{row.nama_panggilan}</span>
                <span className="sosial-lb-sesi">{row.sesi_count}x sesi</span>
                <span className="sosial-lb-score">{Math.round(row.avg_skor)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="home-bottom-nav">
        <button type="button" className="home-nav-item" onClick={onNavigateHome} aria-label="Home">
          <img src={iconNavHome} alt="Home" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateSimulasi} aria-label="Simulasi">
          <img src={iconNavMic} alt="Simulasi" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item home-nav-item--active" aria-label="Sosial">
          <img src={iconGroup} alt="Sosial" className="home-nav-icon home-nav-icon--active" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateProfile} aria-label="Profile">
          <img src={iconNavUser} alt="Profile" className="home-nav-icon" />
        </button>
      </div>
    </div>
  );
}
