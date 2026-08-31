import React from "react";
import "./ModuleDetailScreen.css";

// ─── Assets ──────────────────────────────────────────────────────────────────
import iconOpenDoor from "../assets/pages_assets/modul_details/icons/Open-Door-Icon.svg";
import iconPlay from "../assets/pages_assets/home/icons/Play-Icon.svg";
import iconBook from "../assets/pages_assets/home/icons/Book-Outline.svg";

// Module hero images
import imgHeroModul2 from "../assets/pages_assets/modul_details/modul_2/Image-Hero-Modul2.png";
import imgHeroModul7 from "../assets/pages_assets/modul_details/modul_7/Image_Hero_Modul7.png";

// Lesson images for Modul 2
import imgModul2Lesson1 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson1.png";
import imgModul2Lesson2 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson2.png";
import imgModul2Lesson3 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson3.png";
import imgModul2Lesson4 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson4.png";
import imgModul2Lesson5 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson5.png";
import imgModul2Lesson6 from "../assets/pages_assets/modul_details/modul_2/Image-Lesson6.png";

// Lesson images for Modul 7
import imgModul7Lesson1 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson1.png";
import imgModul7Lesson2 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson2.png";
import imgModul7Lesson3 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson3.png";
import imgModul7Lesson4 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson4.png";
import imgModul7Lesson5 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson5.png";
import imgModul7Lesson6 from "../assets/pages_assets/modul_details/modul_7/Image-Lesson6.png";

// ─── Dotted Arrow Connector ──────────────────────────────────────────────────
const DottedArrow = () => (
  <div className="module-detail-arrow-divider" aria-hidden="true">
    <svg width="12" height="34" viewBox="0 0 12 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 0V26"
        stroke="#243238"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      <path
        d="M2.5 23L6 28L9.5 23"
        stroke="#243238"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

// ─── Check Circle Icon using currentColor ────────────────────────────────────
const IconCheckCircle = ({ className }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M6.5 1.08334C9.4916 1.08334 11.9166 3.50839 11.9166 6.50001C11.9166 9.49163 9.4916 11.9167 6.5 11.9167C3.50835 11.9167 1.08331 9.49163 1.08331 6.50001C1.08331 3.50839 3.50835 1.08334 6.5 1.08334ZM8.41477 4.53972L5.73352 7.22097L4.58519 6.07209C4.48362 5.97045 4.34584 5.91333 4.20215 5.91327C4.05846 5.91322 3.92064 5.97026 3.819 6.07182C3.71736 6.17339 3.66023 6.31117 3.66018 6.45486C3.66013 6.59855 3.71716 6.73637 3.81873 6.83801L5.31265 8.33193C5.36798 8.38728 5.43367 8.4312 5.50598 8.46116C5.57829 8.49112 5.65579 8.50654 5.73406 8.50654C5.81233 8.50654 5.88983 8.49112 5.96214 8.46116C6.03445 8.4312 6.10015 8.38728 6.15548 8.33193L9.18123 5.30618C9.28287 5.20454 9.33997 5.06669 9.33997 4.92295C9.33997 4.77921 9.28287 4.64136 9.18123 4.53972C9.07959 4.43808 8.94174 4.38098 8.798 4.38098C8.65426 4.38098 8.51641 4.43808 8.41477 4.53972Z"
      fill="currentColor"
    />
  </svg>
);

// ─── Play Icon using currentColor ────────────────────────────────────────────
const IconPlaySmall = ({ className }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M5.5 3.5L12.5 8L5.5 12.5V3.5Z" />
  </svg>
);

// ─── Loading Progress Icon ───────────────────────────────────────────────────
const IconProgressWhite = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5.5" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 2"/>
    <path d="M8 5V8L10 10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Default Lessons Data for Modul 2 ────────────────────────────────────────
const DEFAULT_MODUL_2_LESSONS = [
  {
    id: 1,
    lessonNumber: 1,
    status: "Selesai",
    title: "Tarik Napas, Mulai Bicara",
    description: "Latihan pemanasan singkat untuk menurunkan ketegangan sebelum bicara.",
    tag: "Testing Available",
    image: imgModul2Lesson1,
    isCompleted: true,
  },
  {
    id: 2,
    lessonNumber: 2,
    status: "Selesai",
    title: "Postur yang Siap Berbicara",
    description: "Melatih posisi tubuh yang stabil dan nyaman tanpa memaksa gaya percaya diri.",
    tag: null,
    image: imgModul2Lesson2,
    isCompleted: true,
  },
  {
    id: 3,
    lessonNumber: 3,
    status: "Selesai",
    title: "Buat Suaramu Terdengar",
    description: "Melatih volume, artikulasi, dan posisi mikrofon.",
    tag: null,
    image: imgModul2Lesson3,
    isCompleted: true,
  },
  {
    id: 4,
    lessonNumber: 4,
    status: "Selesai",
    title: "Jeda, Bukan “Eee”",
    description: "Mengenali dan mengganti kata pengisi dengan jeda yang disengaja.",
    tag: null,
    image: imgModul2Lesson4,
    isCompleted: true,
  },
  {
    id: 5,
    lessonNumber: 5,
    status: "Selesai",
    title: "Temukan Kecepatan Nyamanmu",
    description: "Memahami bahwa kecepatan bicara harus mendukung pemahaman audiens.",
    tag: null,
    image: imgModul2Lesson5,
    isCompleted: true,
  },
  {
    id: 6,
    lessonNumber: 6,
    status: "Selesai",
    title: "Satu Pesan, Tiga Poin",
    description: "Menyusun pesan sederhana dengan pembukaan, tiga poin, dan penutup.",
    tag: null,
    image: imgModul2Lesson6,
    isCompleted: true,
  },
];

// ─── Default Lessons Data for Modul 7 (Figma Node 104:1324) ──────────────────
const DEFAULT_MODUL_7_LESSONS = [
  {
    id: 1,
    lessonNumber: 1,
    status: "Selesai",
    title: "Jeda Sebelum Menjawab",
    description: "Menggunakan jeda satu sampai tiga detik untuk memberi waktu berpikir.",
    tag: null,
    image: imgModul7Lesson1,
    isCompleted: true,
  },
  {
    id: 2,
    lessonNumber: 2,
    status: "Selesai",
    title: "Jawab Pertanyaan yang Diperkirakan",
    description: "Menjawab pertanyaan yang masih berhubungan langsung dengan topik.",
    tag: null,
    image: imgModul7Lesson2,
    isCompleted: true,
  },
  {
    id: 3,
    lessonNumber: 3,
    status: "Selesai",
    title: "Jawaban Empat Langkah",
    description: "Menggunakan pola gagasan–alasan–contoh–penegasan.",
    tag: null,
    image: imgModul7Lesson3,
    isCompleted: true,
  },
  {
    id: 4,
    lessonNumber: 4,
    status: "Selesai",
    title: "Minta Klarifikasi",
    description: "Meminta pertanyaan dijelaskan kembali tanpa terlihat panik.",
    tag: null,
    image: imgModul7Lesson4,
    isCompleted: true,
  },
  {
    id: 5,
    lessonNumber: 5,
    status: "Selesai",
    title: "Saat Belum Tahu Jawabannya",
    description: "Menyatakan batas pengetahuan dan langkah berikutnya secara profesional.",
    tag: null,
    image: imgModul7Lesson5,
    isCompleted: true,
  },
  {
    id: 6,
    lessonNumber: 6,
    status: null,
    title: "Hadapi Pertanyaan Menantang",
    description: "Merespons pertanyaan kritis atau ketidaksetujuan dengan tenang.",
    tag: "Testing Available",
    image: imgModul7Lesson6,
    isCompleted: false,
    isActive: true,
  },
];

export default function ModuleDetailScreen({
  moduleData,
  onBack,
  onStartLesson,
  onOpenNextModule,
}) {
  const modNumber = moduleData?.id || 7;
  const modLabel = moduleData?.module || (modNumber === 7 ? "Modul 7" : `Modul ${modNumber}`);
  const modTitle = moduleData?.title || (modNumber === 7 ? "Keahlian Tanya Jawab" : "Fondasi Suara dan Tubuh");
  const totalLessons = moduleData?.lessons || 6;
  const progressText = moduleData?.progress || (modNumber === 7 ? "1/6 Selesai" : "6/6 Selesai");
  const modHeroImage = moduleData?.heroImage || (modNumber === 7 ? imgHeroModul7 : imgHeroModul2);
  const lessons = moduleData?.lessonsList || (modNumber === 7 ? DEFAULT_MODUL_7_LESSONS : DEFAULT_MODUL_2_LESSONS);
  const nextModNumber = modNumber < 8 ? modNumber + 1 : 1;

  // Find the active/next lesson to start — only among lessons actually
  // available to play (tagged "Testing Available"), so the hero button never
  // points at a lesson that's still locked in the list below.
  const isAvailable = (l) => Boolean(l.tag && l.tag.toLowerCase().includes("testing"));
  const activeLesson = lessons.find((l) => (l.isActive || !l.isCompleted) && isAvailable(l));
  const startLessonNum = activeLesson ? activeLesson.lessonNumber : (modNumber === 7 ? 6 : 1);

  return (
    <div className="module-detail-screen" data-node-id="104:1324" data-name="Detail Chapter (Modul 7)">
      {/* ── Scrollable Body ──────────────────────────────────── */}
      <div className="module-detail-scroll-body">

        {/* ── Hero Section with Dynamic Background ── */}
        <div
          className={`module-detail-hero ${modNumber === 7 ? "module-detail-hero--modul7" : "module-detail-hero--modul2"}`}
          data-node-id="104:1325"
        >
          {/* Main Hero Background & Illustration Image */}
          <div className="module-detail-hero-bg-wrapper" data-node-id="104:1347">
            <img
              src={modHeroImage}
              alt={modTitle}
              className="module-detail-hero-bg-img"
            />
          </div>

          {/* Top Bar Back Button */}
          <div className="module-detail-topbar" data-node-id="104:1431">
            <button
              type="button"
              className="btn-module-back"
              onClick={onBack}
              aria-label="Kembali ke Beranda"
              data-node-id="104:1432"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Title & Info Block */}
          <div className="module-detail-title-block" data-node-id="104:1348">
            <span className="module-detail-label" data-node-id="104:1349">{modLabel}</span>
            <h1 className="module-detail-title" data-node-id="104:1350">{modTitle}</h1>

            <div className="module-detail-meta" data-node-id="104:1351">
              <div className="module-detail-meta-item" data-node-id="104:1352">
                <img src={iconBook} alt="" className="module-detail-book-icon" />
                <span className="module-detail-meta-text">{totalLessons} Pelajaran</span>
              </div>
              <div className="module-detail-meta-item" data-node-id="104:1358">
                <IconProgressWhite />
                <span className="module-detail-meta-text">{progressText}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button inside Hero */}
          <button
            type="button"
            className="btn-module-start"
            onClick={() => onStartLesson?.(startLessonNum, { id: modNumber, module: modLabel, title: modTitle })}
            data-node-id="104:1365"
          >
            <img src={iconPlay} alt="" className="btn-module-play-icon" />
            <span>Mulai Pelajaran ke-{startLessonNum}</span>
          </button>
        </div>

        {/* ── Lessons List View ────────────────────────────────── */}
        <div className="module-detail-lessons-list" data-node-id="104:1371">
          {lessons.map((lesson, index) => {
            const isCompleted = lesson.isCompleted || lesson.status === "Selesai";
            const isActive = lesson.isActive || (!isCompleted && lesson.lessonNumber === startLessonNum);
            const isTestingAvailable = Boolean(lesson.tag && lesson.tag.toLowerCase().includes("testing"));

            return (
              <React.Fragment key={lesson.id}>
                {/* Lesson Card */}
                <div
                  className={`module-lesson-card ${isActive ? "module-lesson-card--active" : ""}`}
                  data-node-id={`lesson-${lesson.id}`}
                >
                  <div className="module-lesson-content" data-node-id="104:1373">
                    <div className="module-lesson-thumb-wrapper" data-node-id="104:1374">
                      <img src={lesson.image} alt={lesson.title} className="module-lesson-thumb" />
                    </div>
                    <div className="module-lesson-info" data-node-id="104:1375">
                      {isCompleted && (
                        <span className="module-lesson-status" data-node-id="104:1376">Selesai</span>
                      )}
                      <h3 className="module-lesson-title" data-node-id="104:1377">{lesson.title}</h3>
                      <p className="module-lesson-desc" data-node-id="104:1378">{lesson.description}</p>
                      {lesson.tag && (
                        <span className="module-lesson-tag">{lesson.tag}</span>
                      )}
                    </div>
                  </div>

                  {/* Lesson Action Button: Only active if isTestingAvailable, otherwise inactive */}
                  {isTestingAvailable ? (
                    isCompleted ? (
                      <button
                        type="button"
                        className="btn-lesson-status btn-lesson-status--completed"
                        onClick={() => onStartLesson?.(lesson.lessonNumber, { id: modNumber, module: modLabel, title: modTitle })}
                        data-node-id="104:1379"
                      >
                        <IconCheckCircle className="btn-lesson-check-icon" />
                        <span>Pelajaran ke-{lesson.lessonNumber}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-lesson-status btn-lesson-status--current"
                        onClick={() => onStartLesson?.(lesson.lessonNumber, { id: modNumber, module: modLabel, title: modTitle })}
                        data-node-id="104:1394"
                      >
                        <IconPlaySmall className="btn-lesson-play-icon" />
                        <span>Pelajaran ke-{lesson.lessonNumber}</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="btn-lesson-status btn-lesson-status--inactive"
                      disabled
                      aria-disabled="true"
                      data-node-id="53:454"
                    >
                      {isCompleted && <IconCheckCircle className="btn-lesson-check-icon" />}
                      <span>Pelajaran ke-{lesson.lessonNumber}</span>
                    </button>
                  )}
                </div>

                {/* Dotted Arrow Connector between cards and to next module button */}
                <DottedArrow />
              </React.Fragment>
            );
          })}

          {/* ── Next Module Unlock Button (Inactive for Modul 7 -> 8, Active for others) ── */}
          <button
            type="button"
            className={`btn-open-next-module ${modNumber === 7 ? "btn-open-next-module--inactive" : ""}`}
            onClick={modNumber === 7 ? undefined : () => onOpenNextModule?.(nextModNumber)}
            disabled={modNumber === 7}
            data-node-id="68:571"
            aria-disabled={modNumber === 7}
          >
            <span>Buka Modul {nextModNumber}</span>
            <img src={iconOpenDoor} alt="" className="btn-open-door-icon" />
          </button>
        </div>

      </div>
    </div>
  );
}
