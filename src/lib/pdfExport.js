import jsPDF from "jspdf";
import { analyzeTranscript } from "./transcriptAnalysis";

/**
 * Generates a clean, professional PDF report for a SpeakUp speech analysis session.
 *
 * @param {Object} options
 * @param {string} options.title - Scenario title (e.g. "Modul 7: Keahlian Tanya Jawab" or "Simulasi Spontan")
 * @param {string} options.userName - User name
 * @param {string} options.category - Category (e.g. "Lesson", "Spontan", "Presentasi", "Interview")
 * @param {Object} options.scores - Array of score items [{ label, value, unit, note, chip }]
 * @param {Object} options.metrics - Array of metric items [{ label, value, unit, chip }]
 * @param {string|Array} options.feedback - AI feedback text or array of suggestions
 * @param {string} options.motivasi - Motivational headline/quote
 * @param {string} options.transcript - Full spoken transcript text
 * @param {string} [options.date] - Date formatted
 */
export async function exportAnalysisToPDF({
  title = "Analisis Latihan Berbicara",
  userName = "Pengguna SpeakUp",
  category = "Latihan Mandiri",
  scores = [],
  metrics = [],
  feedback = "",
  motivasi = "",
  transcript = "",
  date = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── 1. Top Header Banner (Brand Colors) ──────────────────────────────────
  doc.setFillColor(23, 103, 79); // Dark teal #17674F
  doc.rect(margin, y, contentWidth, 24, "F");

  doc.setFillColor(232, 117, 61); // Orange accent bar #E8753D
  doc.rect(margin, y + 23, contentWidth, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SPEAKUP — LAPORAN ANALISIS BERBICARA", margin + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 245, 240);
  doc.text(`Kategori: ${category}  •  Tanggal: ${date}`, margin + 8, y + 17);

  y += 32;

  // ── 2. Session Info & Motivasi Headline ───────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(36, 50, 56);
  doc.text(title, margin, y);
  y += 6;

  if (motivasi) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(129, 153, 163);
    const motivasiLines = doc.splitTextToSize(`“${motivasi}”`, contentWidth);
    doc.text(motivasiLines, margin, y);
    y += motivasiLines.length * 5 + 4;
  } else {
    y += 2;
  }

  // ── 3. Core Scores Section (Argumen & Relevansi) ──────────────────────────
  if (scores.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(36, 50, 56);
    doc.text("EVALUASI UTAMA", margin, y);
    y += 5;

    const cardWidth = (contentWidth - 6) / scores.length;

    scores.forEach((sc, i) => {
      const cardX = margin + i * (cardWidth + 6);
      doc.setFillColor(250, 248, 243);
      doc.setDrawColor(20, 60, 63, 0.15);
      doc.roundedRect(cardX, y, cardWidth, 24, 3, 3, "FD");

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(36, 50, 56);
      doc.text(sc.label, cardX + 6, y + 8);

      // Score
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(232, 117, 61);
      doc.text(`${sc.value}${sc.unit ? " " + sc.unit : ""}`, cardX + 6, y + 17);

      // Badge/Chip
      if (sc.chip) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(23, 103, 79);
        doc.text(`[${sc.chip}]`, cardX + cardWidth - 24, y + 8);
      }
    });

    y += 29;
  }

  // ── 4. Delivery Metrics Grid (Kata Pengisi, Kecepatan, Kejelasan, Energi) ──
  if (metrics.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(36, 50, 56);
    doc.text("METRIK PENYAMPAIAN & RITME", margin, y);
    y += 5;

    const colWidth = (contentWidth - 9) / 4;

    metrics.forEach((met, i) => {
      const colX = margin + i * (colWidth + 3);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(20, 60, 63, 0.15);
      doc.roundedRect(colX, y, colWidth, 22, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(129, 153, 163);
      doc.text(met.label, colX + 4, y + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(36, 50, 56);
      doc.text(`${met.value} ${met.unit || ""}`, colX + 4, y + 14);

      if (met.chip) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(met.chipTone === "warn" ? 218 : 23, met.chipTone === "warn" ? 80 : 103, met.chipTone === "warn" ? 0 : 79);
        doc.text(met.chip, colX + 4, y + 19);
      }
    });

    y += 28;
  }

  // ── 5. AI Feedback & Saran ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(36, 50, 56);
  doc.text("FEEDBACK & REKOMENDASI AI", margin, y);
  y += 5;

  doc.setFillColor(250, 248, 243);
  doc.setDrawColor(20, 60, 63, 0.12);

  const feedbackText = Array.isArray(feedback)
    ? feedback.map((item) => `• ${item}`).join("\n")
    : typeof feedback === "string" && feedback
    ? feedback
    : "Sesi diselesaikan dengan baik. Tingkatkan latihan pernapasan dan kurangi jeda cemas untuk hasil yang lebih optimal.";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(36, 50, 56);
  const splitFeedback = doc.splitTextToSize(feedbackText, contentWidth - 12);
  const fbHeight = Math.max(16, splitFeedback.length * 4.5 + 8);

  doc.roundedRect(margin, y, contentWidth, fbHeight, 3, 3, "FD");
  doc.text(splitFeedback, margin + 6, y + 7);

  y += fbHeight + 7;

  // ── 6. Transcript & Highlighted Speech Analysis ───────────────────────────
  if (transcript) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(36, 50, 56);
    doc.text("TRANSKRIP SUARA & ANALISIS KATA", margin, y);
    y += 5;

    const { stats } = analyzeTranscript(transcript);

    // Mini Legend
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(129, 153, 163);
    doc.text(
      `Total: ${stats.totalWords} Kata  |  Kata Pengisi: ${stats.fillerCount}  |  Koreksi/Repetisi: ${stats.correctionCount}`,
      margin,
      y
    );
    y += 5;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(20, 60, 63, 0.15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(36, 50, 56);
    const splitTranscript = doc.splitTextToSize(`“${transcript}”`, contentWidth - 12);
    const trHeight = Math.min(65, splitTranscript.length * 4.2 + 8);

    doc.roundedRect(margin, y, contentWidth, trHeight, 3, 3, "FD");
    doc.text(splitTranscript.slice(0, 15), margin + 6, y + 6);

    y += trHeight + 8;
  }

  // ── 7. Footer ────────────────────────────────────────────────────────────
  doc.setDrawColor(20, 60, 63, 0.1);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(129, 153, 163);
  doc.text("SpeakUp AI Public Speaking Assistant • https://speakup.app", margin, pageHeight - 7);
  doc.text(`Dicetak untuk: ${userName}`, pageWidth - margin - 45, pageHeight - 7);

  // Save the PDF
  const filename = `SpeakUp_Analisis_${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
