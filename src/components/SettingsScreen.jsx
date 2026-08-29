import React, { useEffect, useState } from "react";
import "./SettingsScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import { supabase } from "../lib/supabaseClient";
import { fetchProfile, updateProfile, deleteAccount, friendlyProfileError } from "../lib/profile";
import { enablePushNotifications } from "../lib/push";

const PUSH_STATUS_HINT = {
  not_configured: "Notifikasi push belum aktif — kredensial Firebase Web belum dipasang di aplikasi ini.",
  unsupported: "Browser ini tidak mendukung notifikasi push.",
  denied: "Izin notifikasi ditolak. Aktifkan lagi lewat pengaturan browser kalau berubah pikiran.",
  no_token: "Gagal mendaftarkan perangkat untuk notifikasi. Coba lagi nanti.",
};

export default function SettingsScreen({ onBack, onNavigateHome, onNavigatePractice, onNavigateSosial }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [namaPanggilan, setNamaPanggilan] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [togglingReminders, setTogglingReminders] = useState(false);
  const [pushHint, setPushHint] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setLoadError("Sesi tidak ditemukan. Coba masuk lagi.");
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      try {
        const profile = await fetchProfile(user.id);
        if (!active) return;
        setNamaPanggilan(profile.nama_panggilan || "");
        setUsername(profile.username || "");
        setRemindersEnabled(Boolean(profile.streak_reminders_enabled));
      } catch (err) {
        if (active) setLoadError(friendlyProfileError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId || saving) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await updateProfile(userId, {
        nama_panggilan: namaPanggilan.trim(),
        username: username.trim(),
      });
      setSaveMessage("Tersimpan.");
    } catch (err) {
      setSaveMessage(friendlyProfileError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminders = async () => {
    if (!userId || togglingReminders) return;
    const next = !remindersEnabled;
    setTogglingReminders(true);
    setPushHint("");
    setRemindersEnabled(next); // optimistic — revert below if the write fails
    try {
      await updateProfile(userId, { streak_reminders_enabled: next });
      // Turning it on is also the natural moment to request notification
      // permission and register this device — no separate "enable push"
      // button needed. Turning off just flips the flag; get_streak_reminder_
      // candidates() already gates on it, so a leftover token is harmless.
      if (next) {
        const result = await enablePushNotifications(userId);
        if (result.status !== "ok") setPushHint(PUSH_STATUS_HINT[result.status] ?? "");
      }
    } catch {
      setRemindersEnabled(!next);
    } finally {
      setTogglingReminders(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    // No manual navigation here — App's onAuthStateChange listener resets
    // to onboarding on SIGNED_OUT, same path a session-expiry logout takes.
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount();
      await supabase.auth.signOut();
    } catch (err) {
      setDeleteError(friendlyProfileError(err));
      setDeleting(false);
    }
  };

  return (
    <div className="settings-screen" data-name="Settings">
      <div className="settings-topbar">
        <button type="button" className="btn-settings-back" onClick={onBack} aria-label="Kembali ke Progress">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#243238" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="settings-topbar-title">Pengaturan</h1>
      </div>

      <div className="settings-scroll-body">
        {loading && <p className="settings-hint-text">Memuat...</p>}
        {!loading && loadError && <p className="settings-error-banner">{loadError}</p>}

        {!loading && !loadError && (
          <>
            <div className="settings-header-card">
              <div className="settings-avatar">{(namaPanggilan || username || email || "?").trim().charAt(0).toUpperCase()}</div>
              <div className="settings-header-text">
                <span className="settings-header-name">{namaPanggilan || username || "Pengguna"}</span>
                <span className="settings-header-email">{email}</span>
              </div>
            </div>

            <section className="settings-section">
              <h2 className="settings-section-title">Edit Profil</h2>
              <form className="settings-form" onSubmit={handleSave}>
                <label className="settings-field-label" htmlFor="settings-nama">
                  Nama Panggilan
                </label>
                <input
                  id="settings-nama"
                  type="text"
                  className="settings-input"
                  value={namaPanggilan}
                  onChange={(e) => setNamaPanggilan(e.target.value)}
                  placeholder="Nama panggilan kamu"
                />

                <label className="settings-field-label" htmlFor="settings-username">
                  Username
                </label>
                <input
                  id="settings-username"
                  type="text"
                  className="settings-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />

                {saveMessage && <p className="settings-hint-text">{saveMessage}</p>}

                <button type="submit" className="btn-settings-save" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            </section>

            <section className="settings-section">
              <h2 className="settings-section-title">Notifikasi</h2>
              <div className="settings-toggle-row">
                <div className="settings-toggle-text">
                  <span className="settings-toggle-label">Pengingat Streak</span>
                  <span className="settings-toggle-caption">
                    Diingatkan kalau kamu belum latihan hari ini dan streak-mu bisa putus.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={remindersEnabled}
                  aria-label="Pengingat Streak"
                  className={`settings-switch ${remindersEnabled ? "settings-switch--on" : ""}`}
                  onClick={handleToggleReminders}
                  disabled={togglingReminders}
                >
                  <span className="settings-switch-knob" />
                </button>
              </div>
              {pushHint && <p className="settings-hint-text">{pushHint}</p>}
            </section>

            <section className="settings-section">
              <h2 className="settings-section-title">Akun</h2>
              <button type="button" className="btn-settings-logout" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </section>

            <section className="settings-section settings-section--danger">
              <h2 className="settings-section-title settings-section-title--danger">Zona Berbahaya</h2>
              {!confirmingDelete ? (
                <button type="button" className="btn-settings-delete" onClick={() => setConfirmingDelete(true)}>
                  Hapus Akun Permanen
                </button>
              ) : (
                <div className="settings-delete-confirm">
                  <p className="settings-delete-warning">
                    Semua data, rekaman, dan riwayat latihan kamu akan dihapus permanen dan tidak bisa
                    dikembalikan. Yakin mau lanjut?
                  </p>
                  {deleteError && <p className="settings-error-banner">{deleteError}</p>}
                  <div className="settings-delete-actions">
                    <button
                      type="button"
                      className="btn-settings-cancel"
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeleteError("");
                      }}
                      disabled={deleting}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn-settings-delete-confirm"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="home-bottom-nav">
        <button type="button" className="home-nav-item" onClick={onNavigateHome} aria-label="Home">
          <img src={iconNavHome} alt="Home" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigatePractice} aria-label="Simulasi">
          <img src={iconNavMic} alt="Simulasi" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateSosial} aria-label="Sosial">
          <img src={iconGroup} alt="Sosial" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item home-nav-item--active" onClick={onBack} aria-label="Profile">
          <img src={iconNavUser} alt="Profile" className="home-nav-icon home-nav-icon--active" />
        </button>
      </div>
    </div>
  );
}
