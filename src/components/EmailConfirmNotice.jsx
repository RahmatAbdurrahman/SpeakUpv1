import React from "react";
import "./EmailConfirmNotice.css";

export default function EmailConfirmNotice({ email, onGoToLogin }) {
  return (
    <div className="confirm-screen" data-name="EmailConfirmNotice">
      <div className="confirm-body">
        <h1 className="confirm-title">Cek email kamu</h1>
        <p className="confirm-subtitle">
          Kami sudah kirim link konfirmasi ke{" "}
          <strong>{email || "email kamu"}</strong>. Buka link itu dulu, baru
          kamu bisa masuk dan mulai latihan.
        </p>
      </div>
      <div className="confirm-actions">
        <button type="button" className="btn-confirm-login" onClick={onGoToLogin}>
          Sudah konfirmasi, Masuk
        </button>
      </div>
    </div>
  );
}
