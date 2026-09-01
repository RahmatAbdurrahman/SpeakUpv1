import React, { useEffect, useRef, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import animaBotLottie from "../assets/lotties/AnimaBot.lottie";
import "./AnalysisProgress.css";

/**
 * Progres 0-100% untuk masa tunggu analisa, lengkap dengan nama tahap.
 *
 * Soal kejujuran angkanya — ada dua jenis titik di sini:
 *
 *  1. BATAS TAHAP itu NYATA. Setiap kali `stage` berubah, itu karena sebuah
 *     await benar-benar selesai (upload beres, analyze-session balas,
 *     generate-feedback balas). Bar tidak pernah mengklaim sebuah tahap tuntas
 *     sebelum peristiwanya sungguh terjadi.
 *
 *  2. GERAK DI DALAM SATU TAHAP itu PERKIRAAN. Server tidak mengirim progres
 *     parsial, jadi persentase merayap asimtotik ke plafon tahapnya dan sengaja
 *     TIDAK PERNAH menyentuhnya sampai peristiwa aslinya datang. Efeknya: bar
 *     boleh terlihat melambat saat menunggu, tapi tidak akan pernah menunjukkan
 *     selesai untuk sesuatu yang belum selesai.
 *
 * Sub-tahap "transcribing -> analyzing" juga perkiraan waktu: keduanya terjadi
 * di dalam SATU panggilan analyze-session, jadi client tidak bisa melihat
 * pergantiannya. Urutannya benar (Groq dulu, lalu Gemini); yang ditebak hanya
 * detik peralihannya. 1600ms diambil dari log produksi (Groq ~0,4-1,2 dtk).
 */
const TAHAP = {
  uploading: { dari: 0, ke: 22, label: "Mengunggah rekaman" },
  transcribing: { dari: 22, ke: 46, label: "Mengubah suara jadi teks" },
  analyzing: { dari: 46, ke: 70, label: "Menganalisis cara bicara" },
  feedback: { dari: 70, ke: 93, label: "Menyusun feedback dari AI" },
  finishing: { dari: 93, ke: 99, label: "Merapikan hasil" },
  done: { dari: 100, ke: 100, label: "Selesai" },
};

const URUTAN = ["uploading", "transcribing", "analyzing", "feedback", "finishing", "done"];
const JEDA_SUB_TAHAP_MS = 1600;

/** Bar + label tahap + daftar langkah, tanpa shell layar — dipakai juga oleh
 *  AnalyzingScreen di LessonModul7Screen yang punya bingkai halamannya sendiri. */
export function AnalysisProgressBar({ stage = "uploading" }) {
  // Tahap yang DITAMPILKAN — sama dengan `stage` dari luar, kecuali saat
  // sub-tahap perkiraan transcribing -> analyzing sedang berjalan.
  const [tahapTampil, setTahapTampil] = useState(stage);
  const [persen, setPersen] = useState(0);
  const persenRef = useRef(0);

  useEffect(() => {
    setTahapTampil(stage);
    if (stage !== "transcribing") return undefined;
    const t = setTimeout(() => setTahapTampil("analyzing"), JEDA_SUB_TAHAP_MS);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    const t = TAHAP[tahapTampil] ?? TAHAP.uploading;

    if (tahapTampil === "done") {
      persenRef.current = 100;
      setPersen(100);
      return undefined;
    }

    // Maju ke lantai tahap ini, tapi jangan pernah mundur.
    persenRef.current = Math.max(persenRef.current, t.dari);
    setPersen(persenRef.current);

    const id = setInterval(() => {
      const sisa = t.ke - persenRef.current;
      if (sisa <= 0.4) return; // menempel di plafon — tunggu peristiwa asli
      persenRef.current += sisa * 0.07;
      setPersen(persenRef.current);
    }, 110);

    return () => clearInterval(id);
  }, [tahapTampil]);

  const tahapAktif = TAHAP[tahapTampil] ?? TAHAP.uploading;
  const indexAktif = URUTAN.indexOf(tahapTampil);

  return (
    <>
      <div className="analysisprog-bar-wrap">
        <div
          className="analysisprog-bar-track"
          role="progressbar"
          aria-valuenow={Math.round(persen)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={tahapAktif.label}
        >
          <div className="analysisprog-bar-fill" style={{ width: `${persen}%` }} />
        </div>
        <span className="analysisprog-percent">{Math.round(persen)}%</span>
      </div>

      <p className="analysisprog-stage">{tahapAktif.label}</p>

      <ol className="analysisprog-steps">
        {URUTAN.filter((k) => k !== "done").map((kunci, i) => {
          const selesai = indexAktif > i;
          const aktif = indexAktif === i;
          return (
            <li
              key={kunci}
              className={`analysisprog-step${selesai ? " selesai" : ""}${aktif ? " aktif" : ""}`}
            >
              <span className="analysisprog-step-dot">{selesai ? "✓" : i + 1}</span>
              <span className="analysisprog-step-label">{TAHAP[kunci].label}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function AnalysisProgress({
  stage = "uploading",
  title = "Menganalisis rekamanmu...",
  tone = "light", // "light" (Simulasi) | "dark" (Live Presentation)
}) {
  return (
    <div className={`analysisprog-screen${tone === "dark" ? " analysisprog-screen--dark" : ""}`}>
      <div className="analysisprog-lottie-wrap">
        <DotLottieReact src={animaBotLottie} loop autoplay className="analysisprog-lottie" />
      </div>
      <p className="analysisprog-title">{title}</p>
      <AnalysisProgressBar stage={stage} />
    </div>
  );
}
