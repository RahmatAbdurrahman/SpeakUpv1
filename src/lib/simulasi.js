import { supabase, invokeFunction } from "./supabaseClient";

/**
 * Real backend model behind the "Simulasi" tab — matches the Flutter app's
 * flow per docs/SPEC.md, docs/ARCHITECTURE.md in the SpeakUp-v1 project
 * (pilih kategori → [upload materi] → prep (kamera) → rekam → feedback).
 *
 * `kategori` only accepts 'spontan' | 'kelas' | 'lomba' | 'interview' at the
 * DB level. The picker screen only shows 3 cards (kelas and lomba share one
 * "Presentasi" card, per Figma), so the merged card is stored as 'kelas' —
 * the two are treated identically in every Edge Function (same Gemini key
 * pool, same prompt shape), so the choice of literal value doesn't change
 * behavior.
 */
export const SCENARIOS = [
  {
    id: "interview",
    kategori: "interview",
    title: "Interview",
    description: "Simulasi wawancara kerja atau beasiswa dengan pertanyaan yang realistis.",
    needsUpload: true,
    uploadLabel: "Upload CV/portofolio kamu",
  },
  {
    id: "presentasi",
    kategori: "kelas",
    title: "Presentasi",
    description: "Presentasi kelas atau pitching lomba — latihan menyampaikan materi ke audiens.",
    needsUpload: true,
    uploadLabel: "Upload PDF materi kamu",
  },
  {
    id: "spontan",
    kategori: "spontan",
    title: "Spontaneous",
    description: "Topik dadakan, waktu mepet. Latih otakmu mikir cepat sambil tetap kalem.",
    needsUpload: false,
  },
];

export async function createSimulation(userId, kategori) {
  const { data, error } = await supabase
    .from("simulations")
    .insert({ user_id: userId, kategori, status: "in_progress" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markSimulationCompleted(simulationId) {
  const { error } = await supabase
    .from("simulations")
    .update({ status: "completed" })
    .eq("id", simulationId);
  if (error) throw error;
}

// ─── Materials (PDF materi / CV — Kelas, Lomba, Interview only) ────────────

const MAX_MATERIAL_BYTES = 10 * 1024 * 1024; // 10MB, per TASKS.md TASK-B1

export function validateMaterialFile(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "File harus berupa PDF.";
  }
  if (file.size > MAX_MATERIAL_BYTES) {
    return "Ukuran file maksimal 10MB.";
  }
  return null;
}

export async function uploadMaterial(userId, simulationId, file) {
  const path = `${userId}/${simulationId}.pdf`;
  const { error } = await supabase.storage
    .from("materials")
    .upload(path, file, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return path;
}

/**
 * The `materials` bucket is private (RLS: owner-only), so the "Slide" toggle
 * on the Presentasi recording screen needs a signed URL to embed the PDF —
 * a plain public URL would 400. 10 minutes comfortably covers one recording
 * take; re-called fresh each time the toggle is opened rather than cached,
 * so an unusually long session never sits on an expired link.
 */
export async function getMaterialSignedUrl(path) {
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

/** Ekstraksi teks PDF langsung di client menggunakan pdfjs-dist */
export async function extractPdfTextClientSide(file) {
  try {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const doc = await loadingTask.promise;

    let pagesText = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) {
        pagesText.push(`📌 Slide ${i}:\n${pageText}`);
      }
    }
    return pagesText.join("\n\n");
  } catch (err) {
    console.warn("extractPdfTextClientSide failed:", err);
    return "";
  }
}

/** Kelas/Lomba: PDF materi → simulation_materials.generated_notes (shown to user). */
export async function generateNotes(simulationId, pdfPath) {
  const data = await invokeFunction("generate-notes", { simulation_id: simulationId, pdf_storage_path: pdfPath });
  return data?.notes ?? "";
}

/** Interview: CV/portofolio → simulation_materials.candidate_context (never shown to user). */
export async function analyzeCv(simulationId, pdfPath) {
  const data = await invokeFunction("analyze-cv", { simulation_id: simulationId, pdf_storage_path: pdfPath });
  return data?.candidate_context ?? "";
}

/**
 * Edge case 11.1 (PDF gagal diparse, mis. hasil scan gambar): Edge Function
 * returns 422, client falls back to a manual text-area instead of cancelling
 * the session (TASK-B2/B3). This writes that manual text directly — kelas
 * gets generated_notes (shown to user), interview gets candidate_context.
 */
export async function saveManualMaterialText(simulationId, kategori, text) {
  const column = kategori === "interview" ? "candidate_context" : "generated_notes";
  const { error } = await supabase
    .from("simulation_materials")
    .upsert({ simulation_id: simulationId, [column]: text }, { onConflict: "simulation_id" });
  if (error) throw error;
}

// ─── Spontan topic banner ("Daily Spontaneous Speak") ──────────────────────

function cleanTopicText(text) {
  if (!text) return "";
  return text
    .replace(/^["'“‘]+|["'”’]+$/g, "")
    .replace(/^(\d+[\.\)]|topik\s*:|pertanyaan\s*:)\s*/i, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function isModeratorOrInterviewerCliche(text) {
  if (!text) return true;
  const lower = text.toLowerCase();
  const cliches = [
    "latar belakang atau alasan",
    "alasan utama anda memilih",
    "poin kunci apa yang ingin",
    "dampak terbesar apa yang ingin",
    "sebelum kita mulai lebih jauh",
    "bagikan kepada kami hari ini",
    "ceritakan sedikit tentang diri anda",
    "mengapa anda melamar",
  ];
  return cliches.some((c) => lower.includes(c));
}

export const SPONTANEOUS_THEMES = [
  "Teknologi & Gadget (misal: pengaruh AI dalam kehidupan harian, screen time smartphone, belanja online vs toko fisik, bioskop vs streaming)",
  "Kebiasaan & Produktivitas (misal: bangun pagi vs begadang, musik saat fokus belajar/kerja, manajemen waktu, olahraga harian, me-time)",
  "Dilema Pilihan Sehari-hari (misal: hemat uang vs self-reward, rencana hidup matang vs spontan, kerja WFH vs WFO, buku fisik vs e-book)",
  "Hubungan Sosial & Pertemanan (misal: sahabat dekat sedikit vs teman banyak, cara menjaga persahabatan, kerja tim vs mandiri)",
  "Pengalaman & Kenangan (misal: kenangan masa sekolah, tempat favorit untuk menenangkan pikiran, nasihat hidup terbaik, liburan impian)",
  "Hobi, Seni & Hiburan (misal: hewan peliharaan, hobi yang tidak menghasilkan uang, musik pengubah suasana hati, kegiatan akhir pekan)",
  "Pengembangan Diri & Mindset (misal: definisi sukses sederhana, cara mengembalikan mood/semangat, belajar bahasa baru, mengatasi rasa gugup)",
];

export const SPONTANEOUS_TOPICS_FALLBACK = [
  "Apakah belajar atau bekerja sambil mendengarkan musik benar-benar membuatmu lebih fokus?",
  "Lebih baik bangun pagi atau begadang saat menyelesaikan pekerjaan penting?",
  "Pentingkah kita membatasi waktu bermain media sosial setiap hari?",
  "Uang vs Passion: Mana yang sebaiknya diprioritaskan di awal karir?",
  "Apakah kecerdasan buatan (AI) akan menggantikan pekerjaan manusia atau justru membantu kita?",
  "Apakah kerja dari rumah (WFH) lebih produktif daripada bekerja langsung di kantor (WFO)?",
  "Buku fisik vs E-book: Mana yang menurutmu memberikan pengalaman membaca lebih menyenangkan?",
  "Pentingkah memiliki hobi yang murni untuk kesenangan tanpa harus menghasilkan uang?",
  "Jika kamu bisa kembali ke masa sekolah, apa satu hal yang ingin kamu lakukan secara berbeda?",
  "Belanja barang impian vs traveling ke tempat baru: Mana pengalaman yang lebih berharga bagimu?",
  "Apakah nilai akademik di sekolah atau kampus menentukan kesuksesan seseorang di masa depan?",
  "Mengapa tidur cukup dan istirahat berkualitas sering kali lebih penting daripada memaksakan lembur?",
  "Apakah smartphone membuat kita semakin dekat atau justru menjauhkan kita dari orang-orang sekitar?",
  "Transportasi umum vs kendaraan pribadi: Bagaimana pengalaman dan sudut pandangmu sehari-hari?",
  "Memiliki sedikit teman dekat yang setia vs memiliki banyak teman tapi sekadar kenal: Mana pilihanmu?",
  "Olahraga di pagi hari vs malam hari: Mana yang paling cocok untuk gaya hidupmu?",
  "Ceritakan satu kebiasaan kecil sehari-hari yang ternyata membawa dampak positif besar dalam hidupmu.",
  "Belanja impulsif: Mengapa kita sering tergoda membeli barang-barang yang sebenarnya tidak kita butuhkan?",
  "Menurutmu, apa kunci utama untuk menjaga persahabatan tetap awet selama bertahun-tahun?",
  "Pengalaman pertama kali berbicara di depan umum yang paling membekas dalam ingatanmu.",
  "Mengapa bersikap jujur dan terbuka sering kali sulit dilakukan tetapi sangat penting?",
  "Apakah menonton film di bioskop masih lebih seru dibandingkan menonton layanan streaming di rumah?",
  "Satu tempat wisata atau sudut kota favorit yang selalu membuatmu merasa tenang saat mengunjunginya.",
  "Bagaimana caramu mengembalikan semangat (mood) saat hari berjalan tidak sesuai rencana?",
  "Pentingkah kita belajar mengatur keuangan pribadi sejak usia muda?",
  "Apakah memiliki rencana hidup yang detail lebih baik daripada menjalani hidup secara fleksibel?",
  "Satu nasihat terbaik dari orang tua, guru, atau sahabat yang selalu kamu ingat sampai hari ini.",
  "Mengapa memiliki waktu luang sendirian (me time) penting untuk kesehatan mental?",
  "Ceritakan satu hal sederhana di sekitarmu yang selalu bisa membuatmu tersenyum hari ini.",
  "Apakah hewan peliharaan seperti kucing atau anjing bisa membantu mengurangi stres?",
  "Pentingkah kita belajar bahasa asing selain bahasa Indonesia dan bahasa Inggris?",
  "Mengapa meluangkan waktu bersama keluarga atau orang terdekat di akhir pekan sangat berharga?",
  "Bagaimana pengaruh lingkungan pertemanan terhadap kebiasaan dan gaya hidup kita?",
  "Apakah kita harus selalu mengikuti tren terbaru di media sosial atau tetap menjadi diri sendiri?",
];

export function getRandomSpontaneousTopic(excludeTopic = "") {
  const pool = SPONTANEOUS_TOPICS_FALLBACK.filter((t) => t !== excludeTopic);
  const list = pool.length > 0 ? pool : SPONTANEOUS_TOPICS_FALLBACK;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

/**
 * Generates a spontaneous speaking topic using Gemini AI across diverse daily life themes.
 * Ensures the topic is an easy, relatable, everyday topic across different categories.
 */
export async function generateSpontaneousTopicAI({ sessionId, simulationId, excludeTopic = "" } = {}) {
  const randomTheme = SPONTANEOUS_THEMES[Math.floor(Math.random() * SPONTANEOUS_THEMES.length)];
  const customPrompt =
    "Kamu adalah AI pelatih public speaking untuk latihan berbicara spontan (impromptu speaking / table topics). " +
    `Buatkan 1 pertanyaan atau topik bicara spontan yang menarik dalam Bahasa Indonesia seputar tema: ${randomTheme}. ` +
    "SYARAT MUTLAK: " +
    "1. Topik HARUS berupa topik/pertanyaan umum, santai, dan mudah dijawab siapa saja berdasarkan sudut pandang dan pengalaman sehari-hari. " +
    "2. JANGAN fokus hanya pada makanan/minuman (variasikan ke topik teknologi, kebiasaan, pertemanan, liburan, produktivitas, atau dilema sehari-hari). " +
    "3. DILARANG membuat pertanyaan wawancara kerja atau basa-basi moderator (misal: 'mengapa memilih topik ini', 'apa latar belakang', dll). " +
    "4. DILARANG membuat topik yang rumit, teoritis, atau akademis. " +
    "5. HANYA keluarkan 1 kalimat pertanyaan topik tanpa pengantar, tanpa nomor, tanpa tanda kutip.";

  // 1. Direct Gemini API if VITE_GEMINI_API_KEY is defined
  const clientKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (clientKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${clientKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: customPrompt }] }],
            generationConfig: { temperature: 0.98, maxOutputTokens: 100 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleaned = cleanTopicText(rawText);
        if (cleaned && !isModeratorOrInterviewerCliche(cleaned) && cleaned !== excludeTopic) {
          return cleaned;
        }
      }
    } catch (err) {
      console.warn("Direct Gemini API generation failed, falling back:", err);
    }
  }

  // 2. Supabase Edge Function with guided context
  if (simulationId) {
    try {
      await saveManualMaterialText(simulationId, "spontan", customPrompt);
    } catch {
      // ignore
    }
  }

  if (sessionId) {
    try {
      const questions = await fetchGeneratedQuestions(sessionId, "spontan");
      if (Array.isArray(questions) && questions.length > 0) {
        const candidate = cleanTopicText(questions[0]);
        if (candidate && !isModeratorOrInterviewerCliche(candidate) && candidate !== excludeTopic) {
          return candidate;
        }
      }
    } catch (err) {
      console.warn("Edge function question generation failed:", err);
    }
  }

  // 3. Fallback to clean random everyday topic
  return getRandomSpontaneousTopic(excludeTopic);
}

// ─── Interview Objectives & Tailored Questions ─────────────────────────────

export const INTERVIEW_OBJECTIVES = [
  {
    id: "kerja",
    label: "Interview Kerja",
    tag: "Job / Career",
    desc: "Fokus ke pengalaman kerja, keahlian profesional, studi kasus, & kecocokan budaya kerja.",
    icon: "💼",
  },
  {
    id: "beasiswa",
    label: "Interview Beasiswa",
    tag: "Scholarship",
    desc: "Fokus ke motivasi studi, rencana riset/akademik, kontribusi bagi Indonesia, & kepemimpinan.",
    icon: "🎓",
  },
  {
    id: "magang",
    label: "Interview Magang",
    tag: "Internship",
    desc: "Fokus ke latar belakang kuliah, proyek akademik, potensi diri, & kemauan belajar.",
    icon: "🚀",
  },
  {
    id: "organisasi",
    label: "Interview Organisasi",
    tag: "Leadership",
    desc: "Fokus ke kepemimpinan, dinamika tim, penyelesaian konflik, & visi program kerja.",
    icon: "👥",
  },
];

export const INTERVIEW_QUESTIONS_BY_OBJECTIVE = {
  kerja: [
    "Can you tell about your professional background and future career goals?",
    "What is your greatest strength and how will it help you succeed in this job position?",
    "Tell me about a challenging work or project situation you faced and how you solved it using the STAR method.",
    "Why are you interested in joining our company and this role specifically?",
  ],
  beasiswa: [
    "Mengapa Anda memilih jurusan dan universitas tujuan Anda, dan apa motivasi terbesar mendaftar beasiswa ini?",
    "Bagaimana rencana studi Anda dan apa kontribusi konkret yang ingin Anda berikan untuk Indonesia setelah lulus nanti?",
    "Ceritakan tantangan akademik atau kegagalan terbesar yang pernah Anda lalui serta bagaimana cara Anda mengatasinya.",
    "Mengapa komite beasiswa harus memilih Anda sebagai penerima beasiswa dibandingkan kandidat berprestasi lainnya?",
  ],
  magang: [
    "Ceritakan latar belakang pendidikan Anda, minat utama, dan proyek kampus yang paling Anda banggakan.",
    "Keahlian atau keterampilan teknis apa yang ingin paling Anda kembangkan selama menjalani program magang ini?",
    "Bagaimana cara Anda membagi prioritas dan waktu ketika menghadapi banyak tugas atau deadline bersamaan?",
    "Mengapa Anda tertarik magang di tim kami dan apa ekspektasi yang ingin Anda capai setelah magang selesai?",
  ],
  organisasi: [
    "Ceritakan pengalaman organisasi atau kepemimpinan Anda dan bagaimana gaya kepemimpinan yang Anda terapkan.",
    "Bagaimana strategi Anda dalam menyelesaikan konflik atau perbedaan pendapat di antara sesama anggota tim?",
    "Apa visi, inovasi, dan program kerja unggulan yang ingin Anda bawa untuk kemajuan organisasi ini?",
    "Bagaimana Anda menjaga komitmen dan tanggung jawab ketika menghadapi situasi kerja di bawah tekanan tinggi?",
  ],
};

/**
 * Generates tailored interview questions based on candidate CV & chosen objective.
 */
export async function generateInterviewQuestionsAI({
  sessionId,
  simulationId,
  objective = "kerja",
  candidateContext = "",
} = {}) {
  const objMeta = INTERVIEW_OBJECTIVES.find((o) => o.id === objective) || INTERVIEW_OBJECTIVES[0];
  const defaultList = INTERVIEW_QUESTIONS_BY_OBJECTIVE[objective] || INTERVIEW_QUESTIONS_BY_OBJECTIVE.kerja;

  // 1. Direct Gemini AI generation if available
  const clientKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (clientKey && candidateContext) {
    try {
      const prompt =
        `Kamu adalah pewawancara profesional untuk sesi wawancara: ${objMeta.label} (${objMeta.desc}). ` +
        `Berikut adalah ringkasan profil / CV kandidat: """${candidateContext.slice(0, 1500)}""". ` +
        `Buatkan TEPAT 4 pertanyaan wawancara yang spesifik, relevan, dan mendalam sesuai fokus ${objMeta.label}. ` +
        `Keluarkan HANYA array JSON string berisi 4 pertanyaan, contoh: ["Pertanyaan 1?", "Pertanyaan 2?", "Pertanyaan 3?", "Pertanyaan 4?"] tanpa markdown backticks tambahan.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${clientKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonMatch = rawText?.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return parsed.slice(0, 4);
          }
        }
      }
    } catch (err) {
      console.warn("Direct Gemini interview questions generation failed:", err);
    }
  }

  // 2. Edge function questions fallback
  if (sessionId) {
    try {
      const questions = await fetchGeneratedQuestions(sessionId, "interview");
      if (Array.isArray(questions) && questions.length >= 3) {
        return questions.slice(0, 4);
      }
    } catch {
      // ignore
    }
  }

  // 3. Structured curated fallback for this specific objective
  return defaultList;
}

/** Also used as the no-real-viewer Q&A fallback for any kategori mid/post-session. */
export async function fetchGeneratedQuestions(sessionId, kategori) {
  const data = await invokeFunction("generate-live-questions", { session_id: sessionId, kategori });
  return data?.questions ?? [];
}

// ─── Sessions & analysis ────────────────────────────────────────────────────

export async function createSessionRow({ id, simulationId, audioPath = null }) {
  const { data, error } = await supabase
    .from("simulation_sessions")
    .insert({
      id,
      simulation_id: simulationId,
      audio_url: audioPath,
      session_status: "completed",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSessionAudio(sessionId, audioPath) {
  const { error } = await supabase
    .from("simulation_sessions")
    .update({ audio_url: audioPath })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function uploadSessionAudio(userId, sessionId, blob) {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const path = `${userId}/${sessionId}.${ext}`;
  const { error } = await supabase.storage
    .from("audio")
    .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: true });
  if (error) throw error;
  return path;
}

/**
 * `onStage` dipanggil di batas-batas yang BENAR-BENAR teramati dari client —
 * tepat sebelum tiap edge function dipanggil, dan setelah keduanya selesai.
 * AnalysisProgress memakai ini sebagai titik jangkar yang jujur; gerak
 * persentase di antaranya cuma perkiraan (lihat komentar di komponen itu).
 */
export async function runAnalysis({ sessionId, audioPath, durationSeconds, onStage }) {
  onStage?.("transcribing");
  await invokeFunction("analyze-session", {
    session_id: sessionId,
    audio_storage_path: audioPath,
    // Real gaze/gesture tracking runs on-device in the Flutter app (see
    // analyze-session's comments) — not built for web yet, so eye_contact
    // and gesture metrics are simply left blank for now.
    on_device_metrics: {},
    session_status: "completed",
    // Used server-side to compute pace_wpm deterministically from the
    // Groq transcript instead of guessing it from audio.
    duration_recorded_seconds: durationSeconds ?? null,
  });

  onStage?.("feedback");
  await invokeFunction("generate-feedback", { session_id: sessionId });
  onStage?.("finishing");
}

export async function fetchSessionResults(sessionId) {
  if (!sessionId) return { metrics: null, feedback: null };
  const [{ data: metrics, error: metricsErr }, { data: feedback, error: feedbackErr }] = await Promise.all([
    supabase.from("simulation_metrics").select("*").eq("session_id", sessionId).maybeSingle(),
    supabase.from("simulation_feedback").select("*").eq("session_id", sessionId).maybeSingle(),
  ]);
  if (metricsErr) throw metricsErr;
  if (feedbackErr) throw feedbackErr;
  return {
    metrics: Array.isArray(metrics) ? metrics[0] : metrics,
    feedback: Array.isArray(feedback) ? feedback[0] : feedback,
  };
}

export function friendlySimulasiError(error) {
  const msg = error?.message || "";
  if (/quota/i.test(msg)) return "Kuota AI lagi penuh, coba lagi sebentar lagi.";
  if (/sibuk|overloaded/i.test(msg)) return "Server AI lagi sibuk, coba lagi sebentar lagi.";
  if (/timeout|tidak merespons/i.test(msg)) return "AI tidak merespons, coba lagi.";
  return msg || "Terjadi kesalahan. Coba lagi.";
}
