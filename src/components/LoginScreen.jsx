import React, { useState } from "react";
import "./LoginScreen.css";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";
import eyeClosedIcon from "../assets/pages_assets/register/eye_closed.svg";
import googleIcon from "../assets/icons/google-icon.svg";
import { supabase } from "../lib/supabaseClient";
import {
  fetchProfile,
  friendlyAuthError,
  readPendingOnboarding,
  clearPendingOnboarding,
  updateProfile,
} from "../lib/profile";

export default function LoginScreen({ onComplete, onBack, onNavigateRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Masukkan email yang valid.");
      return;
    }
    if (!password) {
      setErrorMessage("Masukkan kata sandi kamu.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(friendlyAuthError(error));
      setLoading(false);
      return;
    }

    try {
      let profile = await fetchProfile(data.user.id);

      // Signup on this device may have stashed onboarding answers if email
      // confirmation was required before a session existed to save them.
      // Cleared right after, so this only ever applies once.
      const pending = readPendingOnboarding();
      if (pending) {
        try {
          profile = await updateProfile(data.user.id, {
            ...pending.profileUpdates,
            nama_panggilan: pending.name,
          });
        } finally {
          clearPendingOnboarding();
        }
      }

      onComplete?.({
        name: profile.nama_panggilan || profile.username || "",
        email: data.user.email,
      });
    } catch (err) {
      setErrorMessage(friendlyAuthError(err));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setErrorMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    // On success the browser navigates away to Google — nothing else to do
    // here. We only reach this line if Supabase rejected the request.
    if (error) {
      setErrorMessage(friendlyAuthError(error));
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" data-name="Login">
      <header className="login-topbar">
        <button
          type="button"
          className="login-back-btn"
          onClick={onBack}
          aria-label="Kembali"
        >
          <img src={arrowLeftIcon} alt="" className="login-back-icon" />
        </button>
      </header>

      <form className="login-form-section" onSubmit={handleSubmit}>
        <div className="login-form-body">
          <div>
            <h1 className="login-title">Selamat Datang Kembali</h1>
            <p className="login-subtitle">Masuk buat lanjutin latihanmu.</p>
          </div>

          <div className="login-input-group">
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
              className="login-input"
              autoFocus
              autoComplete="email"
            />

            <div className="login-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                className="login-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-btn-toggle-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle kata sandi"
              >
                <img
                  src={eyeClosedIcon}
                  alt=""
                  className={`login-eye-icon ${showPassword ? "active" : ""}`}
                />
              </button>
            </div>
          </div>

          {errorMessage && <p className="login-error-text">{errorMessage}</p>}
        </div>

        <div className="login-actions-wrapper">
          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <button
            type="button"
            className="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img src={googleIcon} alt="" className="google-icon" />
            <span>Lanjutkan dengan Google</span>
          </button>

          <button type="button" className="btn-switch-auth" onClick={onNavigateRegister}>
            Belum punya akun? Daftar
          </button>
        </div>
      </form>
    </div>
  );
}
