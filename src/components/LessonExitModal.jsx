import React from "react";
import "./LessonExitModal.css";

export default function LessonExitModal({
  onCancel,
  onConfirm,
  title = "Yakin ingin keluar?",
  desc = "Kemajuanmu pada pelajaran ini tidak akan tersimpan jika kamu keluar sekarang.",
  stayText = "Lanjutkan Belajar",
  leaveText = "Keluar Pelajaran",
}) {
  return (
    <div className="lesson-exit-backdrop" onClick={onCancel}>
      <div className="lesson-exit-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="lesson-exit-title">{title}</h2>
        <p className="lesson-exit-desc">{desc}</p>
        <div className="lesson-exit-actions">
          <button type="button" className="btn-lesson-exit-stay" onClick={onCancel}>
            {stayText}
          </button>
          <button type="button" className="btn-lesson-exit-leave" onClick={onConfirm}>
            {leaveText}
          </button>
        </div>
      </div>
    </div>
  );
}
