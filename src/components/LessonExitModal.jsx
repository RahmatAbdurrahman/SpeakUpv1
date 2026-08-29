import React from "react";
import "./LessonExitModal.css";

export default function LessonExitModal({ onCancel, onConfirm }) {
  return (
    <div className="lesson-exit-backdrop" onClick={onCancel}>
      <div className="lesson-exit-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="lesson-exit-title">Yakin ingin keluar?</h2>
        <p className="lesson-exit-desc">
          Kemajuanmu pada pelajaran ini tidak akan tersimpan jika kamu keluar sekarang.
        </p>
        <div className="lesson-exit-actions">
          <button type="button" className="btn-lesson-exit-stay" onClick={onCancel}>
            Lanjutkan Belajar
          </button>
          <button type="button" className="btn-lesson-exit-leave" onClick={onConfirm}>
            Keluar Pelajaran
          </button>
        </div>
      </div>
    </div>
  );
}
