import React, { useEffect, useState } from "react";
import "./SimulasiScreen.css";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import animaBotLottie from "../assets/lotties/AnimaBot.lottie";
import SessionLoadingScreen from "./SessionLoadingScreen";
import { UploadStep, PrepStep, ManualNotesStep } from "./SimulasiScreen";
import {
  uploadMaterial,
  generateNotes,
  saveManualMaterialText,
  extractPdfTextClientSide,
  friendlySimulasiError,
} from "../lib/simulasi";
import { createLivePresentationSession, fetchOwnDisplayName, goLive } from "../lib/sosial";
import { supabase } from "../lib/supabaseClient";

// "Logic Presentasi" pindah ke sini per keputusan pengembangan terbaru:
// upload materi → generate-notes → prep kamera itu ambil apa adanya dari
// SimulasiScreen (lihat UploadStep/PrepStep/ManualNotesStep yang di-export
// dari sana), cuma langkah terakhirnya beda — bukan rekam solo, tapi go live.
const LIVE_SCENARIO = {
  id: "live-presentasi",
  kategori: "kelas",
  title: "Live Presentasi",
  uploadLabel: "Upload PDF materi kamu",
};

export default function LivePresentationScreen({ onBack, onEnterLive }) {
  // creating | upload | processing-materials | manual-notes | prep | going-live
  const [step, setStep] = useState("creating");
  const [simulationId, setSimulationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [notes, setNotes] = useState("");
  const [materialPdfPath, setMaterialPdfPath] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { simulationId: simId, sessionId: sesId } = await createLivePresentationSession(LIVE_SCENARIO.kategori);
        if (!active) return;
        setSimulationId(simId);
        setSessionId(sesId);
        setStep("upload");
      } catch (err) {
        if (!active) return;
        setErrorMessage(friendlySimulasiError(err));
        onBack?.();
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleMaterialUpload = async (file) => {
    setErrorMessage("");
    setStep("processing-materials");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const pdfPath = await uploadMaterial(user.id, simulationId, file);
      // Stored regardless of whether text extraction below succeeds — the
      // Slide toggle during the live broadcast shows the PDF itself, same
      // reasoning as SimulasiScreen's own Presentasi flow.
      setMaterialPdfPath(pdfPath);

      // 1. Ekstraksi teks PDF langsung di client (100% reliable)
      const clientExtractedText = await extractPdfTextClientSide(file);

      // 2. Minta ringkasan AI jika Edge Function tersedia
      let text = "";
      try {
        text = await generateNotes(simulationId, pdfPath);
      } catch (genErr) {
        console.warn("generateNotes Edge Function failed, using client extraction:", genErr);
      }

      const finalNotes = text || clientExtractedText;

      if (!finalNotes) {
        setStep("manual-notes");
        return;
      }

      // Simpan catatan ke simulation_materials
      try {
        await saveManualMaterialText(simulationId, LIVE_SCENARIO.kategori, finalNotes);
      } catch (saveErr) {
        console.warn("saveManualMaterialText error:", saveErr);
      }

      setNotes(finalNotes);
      setStep("prep");
    } catch (err) {
      console.error("Upload error:", err);
      // Fallback ke manual notes jika ada kendala pemrosesan PDF
      const status = err?.context?.status ?? err?.status;
      if (status === 422 || err?.message?.includes("internal") || err?.message?.includes("kesalahan")) {
        setStep("manual-notes");
        return;
      }
      setErrorMessage(friendlySimulasiError(err));
      setStep("upload");
    }
  };

  const handleManualNotes = async (text) => {
    setErrorMessage("");
    setStep("processing-materials");
    try {
      if (text && text.trim()) {
        await saveManualMaterialText(simulationId, LIVE_SCENARIO.kategori, text);
      }
      setNotes(text || "");
      setStep("prep");
    } catch (err) {
      console.warn("saveManualMaterialText error:", err);
      // Tetap lanjutkan ke prep dengan catatan di local state
      setNotes(text || "");
      setStep("prep");
    }
  };

  const handleGoLive = async () => {
    setErrorMessage("");
    setStep("going-live");
    try {
      const [room, hostName] = await Promise.all([goLive(sessionId), fetchOwnDisplayName()]);
      onEnterLive?.({
        roomId: room.id,
        hostId: room.host_id,
        sessionId: room.session_id,
        simulationId,
        title: `Live Presentasi: ${hostName}`,
        hostName,
        notes,
        materialPdfPath,
      });
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      setStep("prep");
    }
  };

  if (step === "creating") {
    return <SessionLoadingScreen text="Menyiapkan sesi live..." />;
  }

  if (step === "upload") {
    return (
      <UploadStep
        scenario={LIVE_SCENARIO}
        uploading={false}
        error={errorMessage}
        onBack={onBack}
        onSubmit={handleMaterialUpload}
      />
    );
  }

  if (step === "processing-materials") {
    return (
      <div className="simulasi-processing-screen">
        <div className="simulasi-processing-lottie-wrap">
          <DotLottieReact src={animaBotLottie} loop autoplay className="simulasi-processing-lottie" />
        </div>
        <p className="simulasi-processing-title">Memproses materi kamu...</p>
        <p className="simulasi-processing-sub">
          AI kami lagi baca file-nya, biasanya cuma beberapa detik. Untuk file hasil scan gambar, ini bisa lebih lama — mohon tunggu, jangan tutup halaman ini.
        </p>
      </div>
    );
  }

  if (step === "manual-notes") {
    return (
      <ManualNotesStep
        scenario={LIVE_SCENARIO}
        saving={false}
        onBack={() => setStep("upload")}
        onSubmit={handleManualNotes}
      />
    );
  }

  if (step === "going-live") {
    return <SessionLoadingScreen text="Memulai siaran live..." />;
  }

  return (
    <PrepStep
      scenario={LIVE_SCENARIO}
      notes={notes}
      error={errorMessage}
      startLabel="Mulai Live"
      onBack={onBack}
      onStart={handleGoLive}
    />
  );
}
