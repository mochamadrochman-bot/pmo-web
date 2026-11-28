# Handoff Proyek Video Presentasi PMO Dashboard (`vid-remotion`)

Dokumen ini merangkum seluruh struktur, aset, skrip, dan konfigurasi yang sudah dibuat agar proses lanjutan (penyesuaian visual, timing, penambahan CCTV eksternal, hingga render MP4) bisa langsung dilanjutkan tanpa mengulang dari awal.

---

## 1. Spesifikasi Komposisi Remotion

- **ID Komposisi:** `PmoExecutiveBrief`
- **Resolusi & FPS:** `1920 × 1080`, `30 fps`
- **Total Durasi:** `3900` frames (`2 menit 10 detik`)
- **Target Audiens:** Direksi & Pejabat Grade 1 (konsep gabungan *Executive Morning Brief × Apple-style Showcase*)

---

## 2. Struktur File Penting

| File | Fungsi |
| :--- | :--- |
| `vid-remotion/src/Root.tsx` | Registrasi komposisi `PmoExecutiveBrief` (`durationInFrames={3900}`, `defaultProps={{ externalCctvFile: undefined }}`) |
| `vid-remotion/src/PmoPresentation.tsx` | Timeline utama seluruh babak (`01` s.d. `08b`), pengatur `startFrom`, `playbackRate`, `zoomSteps`, dan sinkronisasi `<Audio>` |
| `vid-remotion/src/components/Device3DFrame.tsx` | Bingkai browser/mobile 3D perspektif (`1472×828` area video + `34px` topbar, `objectFit: 'contain'`, mendukung `zoomTarget` dan `zoomSteps` multi-tahap) |
| `vid-remotion/src/scenes/TitleIntroScene.tsx` | Babak 1 (*Morning Friction*): animasi dokumen/spreadsheet (`XLSX`, `PDF`, `CHAT`) melayang lalu menyatu ke logo resmi PMO berpendar |
| `vid-remotion/src/scenes/MobileSplitScene.tsx` | Babak 5a (*Dual Mobile Split*): menampilkan Portal Mobile di kiri dan Executive Monthly di kanan secara berdampingan |
| `vid-remotion/src/scenes/ClosingScene.tsx` | Babak 5b (*Closing*): memutar `media/sena-closing.mp4` (bersuara), lalu transisi ke logo resmi PMO berpendar + `pmopetrokimia.tech` |
| `vid-remotion/src/scenes/Visual3DCctvScene.tsx` | Komponen cadangan split-screen (saat ini Galeri & 3D Tangki dibuat layar penuh terpisah di `PmoPresentation.tsx`) |
| `vid-remotion/record-clips.mjs` | Skrip Playwright perekam klip otomatis dari `https://pmopetrokimia.tech` |
| `vid-remotion/generate-vo.py` | Skrip generator narasi suara AI Indonesia (`edge-tts`, voice `id-ID-ArdiNeural`, rate `+4%`) |

---

## 3. Daftar Klip & Aset yang Sudah Siap

### A. Klip Rekaman Playwright (`vid-remotion/clips/*.webm`, di-junction ke `vid-remotion/public/clips/`)
- `clip1-portal-executive.webm` — Portal Proyek → Executive Dashboard
- `clip2a-epcc-engineering.webm` — EPCC Engineering (`TANGKI ASAM SULFAT 2X20.000 TON`)
- `clip2b-epcc-procurement.webm` — EPCC Procurement (`TANGKI ASAM SULFAT 2X20.000 TON`)
- `clip2c-epcc-construction.webm` — EPCC Construction (`TANGKI ASAM SULFAT 2X20.000 TON`)
- `clip2d-epcc-commissioning.webm` — EPCC Commissioning (`TANGKI ASAM SULFAT 2X20.000 TON`)
- `clip2e-master-schedule.webm` — Master Schedule (`TANGKI ASAM SULFAT 2X20.000 TON`)
- `clip3-reports.webm` — Buat Laporan Weekly (scroll PDF preview) + Weekly Progress Mode Presentasi
- `clip4-visual-3d.webm` — Model 3D Tangki Asam Sulfat (tunggu render WebGL + klik Layar penuh)
- `clip4b-gallery.webm` — Modal Galeri foto terbuka (`pmoGallery.open`)
- `clip5-governance.webm` — Arsip Materi (`/arsip`) & Kelola Akun (`/admin/akun`)
- `clip6a-mobile-portal.webm` & `clip6b-mobile-exec.webm` — Tampilan Mobile `430×932`
- `clip7-ai-sena.webm` — Interaksi tanya jawab dengan AI Sena di Executive Dashboard
- `clip8-spotlight.webm` — Spotlight Lobby (`/app?page=spotlight` melewati video pembuka)

### B. Aset Media (`vid-remotion/public/media/`)
- `brand/logo.png` — Logo resmi PMO (dipakai di `TitleIntroScene` dan `ClosingScene`)
- `sena-closing.mp4` — Video Sena penutup (bersuara)

### C. Audio Narasi AI (`vid-remotion/public/audio/`)
- `vo-01-intro.mp3` (sudah memakai istilah *"proyek pengembangan"*)
- `vo-02-reveal.mp3`
- `vo-03-epcc.mp3` (pelafalan fonetik istilah EPCC & Master Schedule)
- `vo-04-reports.mp3`
- `vo-05-visual-3d.mp3`
- `vo-06a-sena.mp3`
- `vo-06b-spotlight.mp3`
- `vo-07-governance.mp3`
- `vo-08-mobile-closing.mp3`

---

## 4. Perintah Operasional (PowerShell Windows)

> **Catatan:** Di mesin ini PowerShell memblokir `.ps1`, jadi gunakan `.cmd` (`npm.cmd`, `tsc.cmd`).

- **Jalankan Remotion Studio (Preview):**
  ```powershell
  npm.cmd --prefix vid-remotion run studio
  ```
- **Rekam ulang klip tertentu saja (misal `clip4` dan `clip7`):**
  ```powershell
  node vid-remotion/record-clips.mjs --only=clip4,clip7
  ```
- **Perbarui sesi login Playwright jika cookie kedaluwarsa:**
  ```powershell
  npm.cmd --prefix vid-remotion run auth
  ```
- **Generate ulang audio narasi AI:**
  ```powershell
  python vid-remotion/generate-vo.py
  ```
- **Cek TypeScript:**
  ```powershell
  .\vid-remotion\node_modules\.bin\tsc.cmd -p vid-remotion\tsconfig.json --noEmit
  ```
- **Render Final ke MP4:**
  ```powershell
  npm.cmd --prefix vid-remotion run render
  ```
  *(Output: `vid-remotion/out/pmo-executive-brief.mp4`)*

---

## 5. Catatan untuk Penyesuaian Lanjutan

1. **Video CCTV Eksternal:** Jika sudah ada file video CCTV, simpan di `vid-remotion/clips/cctv-external.mp4`, lalu ubah `externalCctvFile` di `vid-remotion/src/Root.tsx` menjadi `'clips/cctv-external.mp4'`.
2. **Penyesuaian Timing / Potongan Awal:** Untuk menggeser titik mulai klip tanpa merekam ulang, cukup ubah nilai `startFrom` (dalam frame, `detik * fps`) dan `playbackRate` di `vid-remotion/src/PmoPresentation.tsx`.
3. **Potongan klip (`segments`):** `Device3DFrame` kini menerima `segments={[{ from, dur, rate }]}` (detik di file klip → detik di video) untuk melompati layar loading tanpa merekam ulang. Dipakai di babak 02 (Portal → Executive), 04 (Laporan → Presentasi), dan 06a (Sena).
4. **Sesi Login:** File `vid-remotion/.auth.json` dan `vid-remotion/clips/` sudah di-ignore di `.gitignore` agar aman saat commit.

---

## 6. Poles 28 Nov 2026 (Claude)

- **Tanpa kedipan hitam antar-scene:** latar `ExecutiveBackdrop` dipasang tetap di `PmoPresentation.tsx`; scene hanya memudarkan isi (judul + bingkai), bukan latarnya (`Device3DFrame`, `MobileSplitScene`).
- **Intro (babak 01) tidak diam lagi:** dorongan kamera pelan 1 → 1,07, jam berjalan `07:45 → 07:59 WIB` dengan hitung mundur "N MENIT LAGI RAPAT PIMPINAN" (merah saat ≤ 5 menit), dua kartu dokumen tambahan (EMAIL 8,6 dtk, PDF 11,2 dtk), judul tidak lagi terpotong jadi 3 baris, dan teks hilang dulu sebelum logo muncul (tidak bertumpuk).
- **Layar loading dilewati:**
  - 02 Portal & Executive: Portal 2–9 dtk, lalu Executive 13,2–21,2 dtk.
  - 04 Laporan: PDF 15–22,5 dtk (1,25×), lalu mode presentasi 24–30 dtk.
  - 05a Galeri: mulai 18,3 dtk (foto sudah termuat) + zoom pelan 1,08.
  - 05b 3D: mulai 23,9 dtk (sudah layar penuh) + zoom pelan 1 → 1,3.
  - 06b Spotlight: mulai 39,5 dtk (pergantian Dermaga A → Tangki Asam Sulfat, bukan video Sena/boot).
- **Sena (06a):** zoom 3× ke panel Sena (kotak tanya → awal jawaban → gulir). Titik potong dibaca dari `src/sena-times.json`.
- **`objectFit`** dipindah ke prop `<Video objectFit="contain">` (peringatan @remotion/media hilang). `tsconfig.json` + `resolveJsonModule`.

### Wajib: rekam ulang klip Sena
`clips/clip7-ai-sena.webm` saat ini berisi **"Batas 5 pertanyaan per hari sudah tercapai"**, bukan jawaban. Rekam ulang setelah kuota akun perekam pulih (besok), atau minta admin menaikkan `SENA_DAILY_LIMIT` sementara di Coolify:
```powershell
node vid-remotion/record-clips.mjs --only=clip7
```
`record-clips.mjs` kini menunggu jawaban Sena v2 selesai (sampai 150 dtk), memperingatkan bila kena batas, menggulir jawaban 8 dtk, dan menulis titik potong ke `src/sena-times.json` secara otomatis. Setiap perekaman memakai 1 jatah pertanyaan.
