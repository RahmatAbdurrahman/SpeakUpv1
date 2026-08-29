# SpeakUp Design System Specification (`design.md`)

> **Version:** 1.2.0  
> **Source:** Figma – *SpeakUp (Public Speaking Training App) - Top 24*  
> **Font:** Space Grotesk (`'Space Grotesk', sans-serif`)  
> **Architecture:** Agile CSS Variable-driven Design System  

Dokumen ini adalah **Single Source of Truth (SSOT)** untuk seluruh komponen UI, token gaya, dan aturan styling di aplikasi SpeakUp. Dibuat secara modular dan agile agar mudah diperluas atau disesuaikan saat ada pembaruan desain dari Figma.

---

## 1. Color Tokens (Palet Warna)

Semua warna didefinisikan sebagai CSS Custom Properties di `:root`. Untuk menambahkan warna baru atau mengubah tema, cukup perbarui token di bawah.

| Token Name | Hex / Value | CSS Variable | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| **Primary** | `#24A981` | `--color-primary` | Warna identitas utama (CTA primer, status aktif, tombol pelajaran selesai, progress) |
| **Primary Dark / Border** | `#17674F` | `--color-primary-dark` | Border bawah & shadow tombol completed / primary (`box-shadow: 0 4px 0 0 #17674F`) |
| **Secondary** | `#E8753D` | `--color-secondary` | Aksen sekunder (highlight, tombol aksi mulai, lencana interaktif, FAB morph) |
| **Secondary Dark / Border**| `#8B4827` | `--color-secondary-dark`| Border bawah & shadow tombol secondary (`box-shadow: 0 4px 0 0 #8B4827`) |
| **Hero Brown (Modul 7)** | `#7C4E28` | `--color-hero-modul7` | Warna latar belakang Hero Card khusus Modul 7 (Keahlian Tanya Jawab) |
| **XP / Reward** | `#E8A63D` | `--color-xp` | Gamifikasi, poin XP, streak, rating bintang, achievement |
| **Text Primary** | `#243238` | `--color-text-primary` | Teks utama, judul (H1–H4), label penting, fill container tag "Testing Available" |
| **Text Secondary** | `#CD4300` / `#DA5000` | `--color-text-secondary` | Teks penekanan khusus, peringatan bernuansa oranye, link aktif |
| **Text Caption** | `#8199A3` | `--color-text-caption` | Teks keterangan, timestamp, sub-label, placeholder |
| **Background** | `#FAF8F3` | `--color-bg-app` | Warna latar belakang kanvas aplikasi |
| **Surface** | `#FFFFFF` | `--color-surface` | Latar kartu (card), modal, sheet, bottom navigation |
| **Border** | `#143C3F1F` | `--color-border` | Garis pembatas kartu & input (`rgba(20, 60, 63, 0.12)`) |
| **Inactive / Disabled Bg** | `#CBD5E1` | `--color-inactive-bg` | Latar tombol / kartu non-aktif |
| **Inactive Border / Shadow** | `#94A3B8` | `--color-inactive-border` | Border & shadow elemen non-aktif |
| **Inactive Text** | `#475569` / `#94A3B8` | `--color-inactive-text` | Teks elemen non-aktif |

---

## 2. Typography Tokens (Tipografi)

Font keluarga tunggal: `'Space Grotesk', sans-serif`.  
Setiap tingkatan teks memiliki utility class dan CSS variables agar dapat digunakan secara repetitif.

| Nama Tingkatan | Font Weight | Ukuran / Line Height | Tracking (Letter Spacing) | CSS Class Utility |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | Bold (700) | `34px` / `1.2` | `-1px` | `.text-h1` |
| **H2** | Bold (700) | `30px` / `1.2` | `-0.85px` | `.text-h2` |
| **H3** | Bold (700) | `26px` / `1.25` | `-0.72px` | `.text-h3` |
| **H4** | Bold (700) | `22px` / `1.3` | `-0.61px` | `.text-h4` |
| **Body (Base)** | Bold (700) | `18px` / `1.4` | `-0.52px` | `.text-body-base` |
| **Body (Small)** | Bold (700) | `14px` / `1.45` | `-0.44px` | `.text-body-sm` |
| **Caption (Base)**| Regular (400) | `12px` / `1.4` | `0px` | `.text-caption-base` |
| **Caption (Small)**| Medium (500) | `10px` / `13px` | `0px` | `.text-caption-sm` |
| **Button (Large)**| Bold (700) | `14px` / `auto` | `0px` | `.text-btn-lg` |
| **Quotes** | Bold (700) | `18px` / `1.6` | `-0.52px` | `.text-quote` |

---

## 3. Agile Spacing & Radius System

Standar sistem grid 4px/8px untuk konsistensi layout responsif:

### Spacing Scale
- `--space-xs`: `4px`
- `--space-sm`: `8px`
- `--space-md`: `16px`
- `--space-lg`: `24px`
- `--space-xl`: `32px`

### Radius Scale
- `--radius-sm`: `8px` (Badge, tag kecil)
- `--radius-md`: `16px` (Card standar, input field)
- `--radius-lg`: `24px` (Modal, bottom sheet, header hero)
- `--radius-full`: `9999px` (Pill button, avatar, tag capsule)

---

## 4. Reusable Component Patterns & Notes

### A. Primary Action Button
```html
<button class="btn-primary">
  <span>Mulai Latihan</span>
</button>
```
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: #FFFFFF;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  border: 1px solid #17674F;
  box-shadow: 0px 4px 0px 0px #17674F;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.15s ease;
}
.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0px 2px 0px 0px #17674F;
}
```

### B. "Testing Available" Tag
- **Fill Container**: Menggunakan `--color-text-primary` (`#243238`).
- **Text Color**: `#FFFFFF` dengan font-weight 500 (`Caption Small` 10px / 13px line-height).
- **Border Radius**: Capsule / Pill (`30px` / `--radius-full`).
- **Padding**: `4px 12px`.

### C. Floating Action Button (FAB) & Morphing Transition
- **Default State**: Tombol bundar berukuran `52px x 52px` berwarna secondary (`#E8753D`), icon `+`, shadow tipis halus (`0px 4px 14px rgba(232, 117, 61, 0.28), 0px 2px 6px rgba(0, 0, 0, 0.06)`).
- **Selected Card State**: Berubah secara halus (*morphing*) menjadi tombol full-width lebar `calc(100% - 32px)` dengan teks *"Mulai"*.
- **Transisi**: Menggunakan Apple-style smooth ease `cubic-bezier(0.16, 1, 0.3, 1)` durasi 300ms tanpa pantulan bouncy.

### D. Module Detail Hero & Connector Rules
- **Modul 2**: Hero background `#24A981` dengan ilustrasi fondasi suara dan tubuh.
- **Modul 7**: Hero background `#7C4E28` dengan ilustrasi sesi tanya jawab, tombol hero *"Mulai Pelajaran ke-6"*.
- **Dotted Arrow Connector**: Menggunakan garis panah putus-putus SVG `stroke="#243238"` yang menghubungkan antar kartu pelajaran serta dari pelajaran terakhir menuju tombol *"Buka Modul [X]"*.
- **Tombol Modul Lanjutan Inactive (Modul 7 $\rightarrow$ 8)**: Tombol *"Buka Modul 8"* diatur **inactive** dengan warna `#CBD5E1`, **tanpa shadow** (`box-shadow: none !important`), dan kursor `not-allowed`.

### E. Lesson Button Inactive State Rule
- Hanya pelajaran yang memiliki tag **`Testing Available`** yang tombolnya aktif dan dapat diklik (hijau untuk completed atau oranye untuk current active).
- Semua pelajaran lain tanpa tag diset **inactive / disabled** berlatar `#CBD5E1`.

---

## 5. Implementasi ke CSS Codebase (`index.css`)

Semua definisi di atas dapat langsung diakses via variabel CSS berikut:

```css
:root {
  /* Colors */
  --color-primary: #24A981;
  --color-primary-dark: #17674F;
  --color-secondary: #E8753D;
  --color-secondary-dark: #8B4827;
  --color-hero-modul7: #7C4E28;
  --color-text-primary: #243238;
  --color-text-secondary: #CD4300;
  --color-text-caption: #8199A3;
  --color-bg-app: #FAF8F3;
  --color-surface: #FFFFFF;
  --color-border: rgba(20, 60, 63, 0.12);
  --color-xp: #E8A63D;
  --color-inactive-bg: #CBD5E1;
  --color-inactive-border: #94A3B8;

  /* Typography */
  --font-family-base: 'Space Grotesk', -apple-system, sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}
```

---

## 6. Agile Extension Guidelines (Panduan Penambahan)

Jika ke depan terdapat penambahan dari Figma:
1. **Warna Baru**: Tambahkan di tabel Bagian 1, lalu daftarkan variabel `--color-<nama>` di `:root`.
2. **Komponen Baru**: Dokumentasikan struktur HTML, CSS, dan aturan interaksinya di Bagian 4.
3. **Dark Mode / Tema Baru**: Cukup override variabel warna di dalam `@media (prefers-color-scheme: dark)` atau `.dark-theme` tanpa perlu mengubah class pada komponen individual.
