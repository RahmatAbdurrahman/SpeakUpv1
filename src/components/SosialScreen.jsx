import React, { useEffect, useRef, useState } from "react";
import "./SosialScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import imgLive from "../assets/pages_assets/sosial/Image-Live.png";
import { supabase } from "../lib/supabaseClient";
import {
  fetchLeaderboard,
  fetchLiveRooms,
  createLivePresentationRoom,
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
import { useUserProgress } from "../context/UserProgressContext";
import { SosialSkeleton } from "./SkeletonLoader";

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
  const [creatingLive, setCreatingLive] = useState(false);
  const { xp } = useUserProgress();
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

      const tasks = [fetchLeaderboard(), fetchLiveRooms()];
      if (user?.id) tasks.push(fetchFriends(user.id), fetchIncomingFriendRequests(user.id));
      const results = await Promise.allSettled(tasks);
      if (!active) return;

      const [boardResult, roomsResult, friendsResult, incomingResult] = results;
      if (boardResult.status === "fulfilled") setLeaderboard(boardResult.value);
      if (roomsResult.status === "fulfilled") setLiveRooms(roomsResult.value);
      if (friendsResult?.status === "fulfilled") setFriends(friendsResult.value);
      if (incomingResult?.status === "fulfilled") setIncomingRequests(incomingResult.value);

      const firstError = results.find((r) => r.status === "rejected");
      if (firstError) setErrorMessage(friendlySosialError(firstError.reason));

      setLoading(false);
    })();

    return () => {
      active = false;
      unsubscribeRef.current?.();
    };
  }, []);

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
      setFriendActionMessage(`Permintaan pertemanan terkirim ke ${result?.friend_nama || username}.`);
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
        // best-effort
      }
    }
  };

  const handleCreateLive = async () => {
    if (creatingLive) return;
    setCreatingLive(true);
    setErrorMessage("");
    try {
      const roomData = await createLivePresentationRoom("kelas");
      if (onJoinRoom) {
        onJoinRoom(roomData);
      }
    } catch (err) {
      setErrorMessage(friendlySosialError(err));
    } finally {
      setCreatingLive(false);
    }
  };

  if (loading && leaderboard.length === 0 && friends.length === 0 && liveRooms.length === 0) {
    return (
      <SosialSkeleton
        onNavigateHome={onNavigateHome}
        onNavigatePractice={onNavigateSimulasi}
        onNavigateSosial={() => {}}
        onNavigateProfile={onNavigateProfile}
      />
    );
  }

  return (
    <div className="sosial-screen" data-name="Sosial">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="sosial-topbar">
        <h1 className="sosial-topbar-title">Sosial</h1>
        <div className="sosial-xp-badge">
          <span>{xp.toLocaleString("id-ID")} XP</span>
        </div>
      </div>

      <div className="sosial-scroll-body">
        {errorMessage && <p className="sosial-error-banner">{errorMessage}</p>}

        {/* ── Match Partner Card ─────────────────────────────────── */}
        <section className="sosial-section">
          <div className="sosial-match-card">
            <div className="sosial-match-badge">
              <span className="sosial-match-badge-dot"></span>
              <span>Matchmaking Duet</span>
            </div>
            <div className="sosial-match-text">
              <h3>Cari Partner Latihan</h3>
              <p>Dipasangkan otomatis dengan pengguna lain untuk latihan bareng & saling beri masukan secara live.</p>
            </div>
            {queueState === "idle" && (
              <button type="button" className="btn-sosial-match" onClick={handleFindPartner}>
                Cari Partner Sekarang
              </button>
            )}
            {queueState === "matching" && (
              <button type="button" className="btn-sosial-match btn-sosial-match--searching" disabled>
                <span className="sosial-btn-spinner" />
                Mencari Partner...
              </button>
            )}
            {queueState === "waiting" && (
              <div className="sosial-waiting-box">
                <div className="sosial-waiting-left">
                  <span className="sosial-waiting-spinner" />
                  <div className="sosial-waiting-info">
                    <span className="sosial-waiting-title">Menunggu partner bergabung...</span>
                    <span className="sosial-waiting-sub">Kamu bisa tetap di halaman ini</span>
                  </div>
                </div>
                <button type="button" className="btn-sosial-cancel-match" onClick={handleCancelQueue}>
                  Batal
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Live Sekarang Section ──────────────────────────────── */}
        <section className="sosial-section">
          <div className="sosial-section-header">
            <div className="sosial-section-title-wrap">
              <h2 className="sosial-section-title">Live Sekarang</h2>
              {liveRooms.length > 0 && (
                <span className="sosial-section-badge">{liveRooms.length} Aktif</span>
              )}
            </div>
            <button
              type="button"
              className="btn-sosial-create-live"
              onClick={handleCreateLive}
              disabled={creatingLive}
            >
              {creatingLive ? "Menyiapkan..." : "➕ Mulai Live"}
            </button>
          </div>

          {loading && <p className="sosial-hint-text">Memuat sesi live...</p>}
          {!loading && liveRooms.length === 0 && (
            <div className="sosial-empty-card">
              <img src={imgLive} alt="Live" className="sosial-live-empty-img" />
              <p className="sosial-empty-title">Belum ada sesi live saat ini</p>
              <p className="sosial-empty-desc">Mulai sesi presentasi live agar pengguna lain dapat bergabung dan menonton!</p>
              <button
                type="button"
                className="btn-sosial-create-live-cta"
                onClick={handleCreateLive}
                disabled={creatingLive}
              >
                {creatingLive ? "Menyiapkan..." : "🎙️ Buat Sesi Presentasi Live"}
              </button>
            </div>
          )}

          {liveRooms.length > 0 && (
            <div className="sosial-live-grid">
              {liveRooms.map((room) => (
                <div key={room.id} className="sosial-live-card">
                  <div className="sosial-live-card-meta">
                    <span className="sosial-live-badge">
                      <span className="sosial-live-dot" /> LIVE
                    </span>
                    <span className="sosial-live-kategori">{KATEGORI_LABEL[room.kategori] || "Latihan"}</span>
                    {room.recommended && <span className="sosial-live-recommended">✨ Rekomendasi</span>}
                  </div>

                  <div className="sosial-live-host-row">
                    <div className="sosial-live-avatar">
                      {(room.hostName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="sosial-live-host-info">
                      <h3 className="sosial-live-host">{room.hostName}</h3>
                      <div className="sosial-live-stats-row">
                        <span className="sosial-live-stat">
                          <img src={iconGroup} alt="" className="sosial-live-stat-icon" />
                          {room.viewerCount} Penonton
                        </span>
                        <span className="sosial-live-stat-dot">•</span>
                        <span className="sosial-live-stat">{timeAgo(room.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-sosial-join"
                    onClick={() =>
                      onJoinRoom?.({
                        roomId: room.id,
                        hostId: room.hostId,
                        sessionId: room.sessionId,
                        title: `Live: ${room.hostName}`,
                        hostName: room.hostName,
                      })
                    }
                  >
                    Gabung Nonton
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Teman Section ──────────────────────────────────────── */}
        <section className="sosial-section">
          <div className="sosial-section-header">
            <h2 className="sosial-section-title">Teman</h2>
            {friends.length > 0 && (
              <span className="sosial-section-badge">{friends.length} Teman</span>
            )}
          </div>

          <form className="sosial-add-friend-box" onSubmit={handleSendFriendRequest}>
            <div className="sosial-input-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#8199A3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="#8199A3" strokeWidth="1.8"/>
                <line x1="19" y1="8" x2="19" y2="14" stroke="#8199A3" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="22" y1="11" x2="16" y2="11" stroke="#8199A3" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="text"
              className="sosial-add-friend-input"
              placeholder="Cari username teman..."
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
            />
            <button
              type="submit"
              className="btn-sosial-add-friend"
              disabled={!friendUsername.trim() || sendingRequest}
            >
              {sendingRequest ? "..." : "Tambah"}
            </button>
          </form>
          {friendActionMessage && <p className="sosial-hint-message">{friendActionMessage}</p>}

          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <div className="sosial-request-list">
              {incomingRequests.map((req) => (
                <div key={req.requestId} className="sosial-request-card">
                  <div className="sosial-request-left">
                    <div className="sosial-friend-avatar">
                      {(req.fromName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="sosial-request-text">
                      <span className="sosial-request-name">{req.fromName}</span>
                      <span className="sosial-request-caption">Mengajak berteman</span>
                    </div>
                  </div>
                  <div className="sosial-request-actions">
                    <button
                      type="button"
                      className="btn-sosial-accept"
                      onClick={() => handleRespondRequest(req.requestId, true)}
                    >
                      Terima
                    </button>
                    <button
                      type="button"
                      className="btn-sosial-decline"
                      onClick={() => handleRespondRequest(req.requestId, false)}
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && friends.length === 0 && incomingRequests.length === 0 && (
            <div className="sosial-empty-friends">
              <p className="sosial-hint-text">Belum ada teman. Tambah teman via username di atas untuk melihat status live mereka!</p>
            </div>
          )}

          {friends.length > 0 && (
            <div className="sosial-friend-list">
              {friends.map((friend) => {
                const liveRoom = liveRooms.find((r) => r.hostId === friend.id);
                return (
                  <div key={friend.id} className="sosial-friend-card">
                    <div className="sosial-friend-avatar-wrap">
                      <div className="sosial-friend-avatar">
                        {(friend.name || "?").charAt(0).toUpperCase()}
                      </div>
                      {liveRoom && <span className="sosial-avatar-live-indicator" />}
                    </div>
                    <div className="sosial-friend-info">
                      <span className="sosial-friend-name">{friend.name}</span>
                      <span className="sosial-friend-sub">
                        {liveRoom ? "Sedang latihan live" : "Aktif di SpeakUp"}
                      </span>
                    </div>
                    {liveRoom ? (
                      <button
                        type="button"
                        className="btn-sosial-friend-live"
                        onClick={() =>
                          onJoinRoom?.({
                            roomId: liveRoom.id,
                            hostId: liveRoom.hostId,
                            sessionId: liveRoom.sessionId,
                            title: `Live: ${friend.name}`,
                            hostName: friend.name,
                          })
                        }
                      >
                        <span className="sosial-live-dot" /> Nonton
                      </button>
                    ) : (
                      <span className="sosial-friend-offline-pill">Offline</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Leaderboard Section ────────────────────────────────── */}
        <section className="sosial-section">
          <div className="sosial-section-header">
            <h2 className="sosial-section-title">Papan Peringkat Minggu Ini</h2>
          </div>

          {loading && <p className="sosial-hint-text">Memuat papan peringkat...</p>}
          {!loading && leaderboard.length === 0 && (
            <div className="sosial-empty-card">
              <span className="sosial-empty-icon">🏆</span>
              <p className="sosial-empty-title">Belum ada data minggu ini</p>
              <p className="sosial-empty-desc">Selesaikan simulasi latihan untuk jadi yang pertama di papan peringkat!</p>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="sosial-leaderboard-container">
              {leaderboard.map((row, i) => {
                const isMe = row.user_id === userId;
                const rank = i + 1;
                const isPodium = rank <= 3;
                const podiumEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                return (
                  <div
                    key={row.user_id}
                    className={`sosial-leaderboard-row ${isMe ? "sosial-leaderboard-row--me" : ""} ${
                      isPodium ? `sosial-leaderboard-row--podium-${rank}` : ""
                    }`}
                  >
                    <div className="sosial-rank-badge">
                      {podiumEmoji ? (
                        <span className="sosial-podium-emoji">{podiumEmoji}</span>
                      ) : (
                        <span className="sosial-rank-num">{rank}</span>
                      )}
                    </div>

                    <div className="sosial-lb-avatar">
                      {(row.nama_panggilan || "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="sosial-lb-user-info">
                      <span className="sosial-lb-name">
                        {row.nama_panggilan} {isMe && <span className="sosial-lb-me-tag">(Kamu)</span>}
                      </span>
                      <span className="sosial-lb-sesi">{row.sesi_count}x sesi latihan</span>
                    </div>

                    <div className="sosial-lb-score-pill">
                      <span className="sosial-lb-score-val">
                        {(row.xp ?? Math.round((row.sesi_count || 0) * 50 + (row.avg_skor || 0) * 2)).toLocaleString("id-ID")}
                      </span>
                      <span className="sosial-lb-score-label">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Bottom Navigation Bar ───────────────────────────────── */}
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
