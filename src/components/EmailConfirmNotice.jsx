import React, { useEffect, useState } from "react";
import "./EmailConfirmNotice.css";
import { supabase } from "../lib/supabaseClient";

// Real bug found via a tester screenshot: nothing on this screen let a user
// retry if Supabase's confirmation email never arrived (rate-limited/spam-
// filtered — the project has no custom SMTP configured, so it's riding
// Supabase's default sender, which is documented as low-volume/testing-only
// and prone to exactly this). With no self-service resend, a delayed or
// dropped email just reads as "this app is broken/scam" — see the reported
// screenshot. This doesn't fix the underlying deliverability problem (that
// needs a real SMTP provider wired up in the Supabase dashboard, which
// isn't something doable from here) but at least gives the user a lever
// to pull instead of being stuck staring at this screen.
//
// Kept >= Supabase Auth's own "Minimum interval per user" (the SMTP settings
// page defaults this to 60s) so the button's cooldown never expires before
// the server's own limit does — otherwise a click right at 45s would just
// bounce off Supabase's rate limit and show the generic "tunggu sebentar"
// error, which looks like our bug rather than an expected wait.
const RESEND_COOLDOWN_SECONDS = 60;

export default function EmailConfirmNotice({ email, onGoToLogin }) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setResendMessage("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendMessage("Email konfirmasi baru sudah dikirim. Cek juga folder Spam/Promosi.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResendMessage(
        /rate|limit|seconds/i.test(err?.message || "")
          ? "Tunggu sebentar sebelum minta kirim ulang lagi."
          : "Gagal kirim ulang. Coba lagi sebentar.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="confirm-screen" data-name="EmailConfirmNotice">
      <div className="confirm-body">
        <h1 className="confirm-title">Cek email kamu</h1>
        <p className="confirm-subtitle">
          Kami sudah kirim link konfirmasi ke{" "}
          <strong>{email || "email kamu"}</strong>. Buka link itu dulu, baru
          kamu bisa masuk dan mulai latihan.
        </p>
        <p className="confirm-hint">
          Tidak masuk juga di folder Spam/Promosi setelah beberapa menit? Coba kirim ulang di bawah.
        </p>
        {resendMessage && <p className="confirm-resend-message">{resendMessage}</p>}
      </div>
      <div className="confirm-actions">
        <button type="button" className="btn-confirm-login" onClick={onGoToLogin}>
          Sudah konfirmasi, Masuk
        </button>
        <button
          type="button"
          className="btn-confirm-resend"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending
            ? "Mengirim..."
            : cooldown > 0
              ? `Kirim ulang lagi dalam ${cooldown}s`
              : "Kirim ulang email konfirmasi"}
        </button>
      </div>
    </div>
  );
}
