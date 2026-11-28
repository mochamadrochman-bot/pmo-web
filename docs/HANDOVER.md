# Handover — Migrasi WEB DASHBOARD PMO ke VPS

> Dokumen serah-terima untuk melanjutkan proyek di editor/agent lain (Claude / Antigravity).
> Diperbarui 15 November 2026. Bahasa kerja: Bahasa Indonesia. Pemilik: SPM Proyek Infrastruktur, PMO Infrastruktur & Process Plant — PT Petrokimia Gresik.
> **Jangan pernah menempel password, isi `.env`, kunci SSH, atau API key ke chat/AI.** Rahasia disimpan di Environment Variables Coolify atau password manager.

---

## 1. Ringkasan singkat

Aplikasi **"WEB DASHBOARD PMO - MULTI PROYEK"** semula berjalan di **Google Apps Script** (data di Google Sheets, lampiran di Google Drive). Aplikasi ini sedang dipindahkan ke:

| Komponen | Isi |
|---|---|
| Kode | GitHub `mochamadrochman-bot/pmo-web` (branch `main`), salinan lokal di laptop: `C:\Users\mocha\Documents\GitHub\pmo-web` (GitHub Desktop) |
| Server | VPS Hostinger, Ubuntu 24.04, IP `189.31.32.97`, dikelola **Coolify v4.7.5** |
| Domain | `https://pmopetrokimia.tech` (registrar Hostinger, DNS Cloudflare) |
| Database | PostgreSQL 18 (resource Coolify `pmo-db`) |
| Lampiran | Tetap di Google Drive (akun Gmail pribadi pemilik), diakses lewat OAuth |

**Pendekatan yang dipilih: "lapisan kompatibilitas" (bukan menulis ulang).** Kode asli Apps Script (`.gs` dan `.html`) disalin apa adanya ke folder `legacy/` dan **dijalankan di Node.js** dengan tiruan API Google (SpreadsheetApp, DriveApp, HtmlService, dll.). Tujuannya: tampilan dan perilaku **sama persis** dengan versi Apps Script, sambil pelan-pelan memindahkan data ke server sendiri.

Status per 15 Nov 2026: server sudah live dan dipakai uji; Apps Script lama **masih menjadi sumber input utama**. Server mengikuti data Google Sheets lewat sinkron otomatis tiap 15 menit (mode **Baca**), dan sudah bisa diuji input di mode **Uji coba**.

---

## 2. Infrastruktur & cara deploy

### 2.1 Alur kerja harian (pemilik bukan programmer — tulis instruksi selangkah demi selangkah)
1. Perubahan kode ditulis ke folder laptop `C:\Users\mocha\Documents\GitHub\pmo-web`.
2. Pemilik membuka **GitHub Desktop** → isi *Summary* → **Commit to main** → **Push origin**.
3. Di **Coolify** (resource `pmo-web`) → **Redeploy**. Coolify membangun ulang image dari `Dockerfile`.
4. Saat redeploy, halaman bisa sebentar menampilkan **"Bad Gateway"** (container baru belum siap). Normal; refresh. Disarankan aktifkan Healthcheck Coolify: path `/health`, port `3000`, start period `30`.

### 2.2 Akses server
- Panel Coolify lewat tunnel SSH: `ssh -L 8000:localhost:8000 deploy@189.31.32.97` lalu buka `http://localhost:8000`. User `deploy` perlu `sudo -i` untuk tugas root.
- **`PermitRootLogin` harus tetap `prohibit-password`** (Coolify login sebagai root dengan kuncinya sendiri; mengubahnya ke `no` membuat backup/deploy Coolify gagal "Permission denied (publickey)").
- Firewall `ufw` aktif. Jangan ubah konfigurasi Traefik (sertifikat SSL sudah benar; peringatan "Not secure" dulu hanya cache Chrome).
- Backup database: Coolify scheduled backup ke **Cloudflare R2**, retensi 14 hari (sudah berhasil). **Belum pernah diuji restore** — lihat Rencana.

### 2.3 Resource Coolify
`My first project` → `production` → `pmo-web` (aplikasi, Dockerfile) dan `pmo-db` (Postgres). Perintah SQL di container DB memakai user `$POSTGRES_USER` (= `postgres`), bukan `pmo`. Saat mencari container DB, kecualikan `coolify-db` (`docker ps | grep pmo | grep -v coolify`).

### 2.4 Environment variables (nama saja — nilainya di Coolify)
| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi Postgres |
| `APP_BASE_URL` | `https://pmopetrokimia.tech` |
| `TZ` | `Asia/Bangkok` (sama dengan zona Apps Script / WIB) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth web client (Google Cloud, gratis; app sudah di-*publish*) |
| `GAS_SPREADSHEET_ID` | ID spreadsheet utama (default `1OVqQZQ9MfBVQl1O2d6VpxQ385wNaGzfJOC-8LduHvcE`) |
| `GAS_SYNC_MINUTES` | Interval sinkron otomatis (default 15) |
| `GAS_READONLY`, `GAS_READONLY_WRITABLE` | Default mode dan sheet yang tetap boleh ditulis di mode Baca (default `AI_LOG`) |
| `GAS_OWNER_EMAIL` | Email yang dianggap pemilik skrip (Session.getEffectiveUser) |
| `LIBRARY_FOLDER_ID`, `PORTAL_HERO_FOLDER`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `AI_DAILY_LIMIT` | Script Properties lama, dibaca langsung dari env (juga bisa `GAS_PROP_<NAMA>`) |
| `SENA_DAILY_LIMIT`, `SENA_MONTHLY_BUDGET_USD`, `CLAUDE_MODEL_FAST`, `SENA_DOC_INDEX`, `SENA_OCR_MAX_PAGES` | Sena v2 (24 Nov): batas pertanyaan/hari per akun (default 5), anggaran bulanan USD (default 10), model cepat (default `claude-haiku-5-5`; `CLAUDE_MODEL` default `claude-sonnet-5-5`), `0` = matikan indeks teks dokumen, maks halaman OCR/dokumen (default 40). `AI_DAILY_LIMIT` tidak dipakai lagi. |
| `LEGACY_LOGIN` | `0` = kembali ke halaman login sederhana (darurat) |
| `LOGIN_MAX_FAILED`, `LOGIN_LOCK_MINUTES`, `LOGIN_MAX_PER_IP`, `SESSION_TTL_HOURS`, `TRUST_PROXY_HOPS`, `PG_POOL_MAX`, `AUTO_MIGRATE` | Keamanan login & teknis |
| `GOOGLE_DRIVE_API`, `GOOGLE_DRIVE_UPLOAD`, `GOOGLE_TOKEN_URL` | Hanya untuk pengujian (mengarahkan ke server tiruan) |

---

## 3. Arsitektur aplikasi

### 3.1 Stack
Node 22 · Express · EJS · PostgreSQL (`pg`) · `@node-rs/argon2` (hash password) · `helmet` · `xlsx` 0.18.5 (impor spreadsheet) · `pdfjs-dist` 4.10 (render PDF di browser, disajikan di `/vendor/pdfjs`). Dockerfile memasang `tzdata`, `TZ=Asia/Bangkok`, dan menyalin folder `legacy/`.

### 3.2 Struktur folder penting
```
legacy/                 Kode Apps Script asli (*.gs, *.html, appsscript.json) + order.json (urutan file .gs)
src/server.js           Titik masuk; muat google auth, kelompok proyek, store, runtime, sinkron; daftar route
src/gas/runtime.js      Inti lapisan kompatibilitas: gabung semua .gs → factory new Function(...),
                        BRIDGE_CODE (override fungsi lama), HTML_PATCHES (tambalan teks pada .html lama),
                        juga skrip sisipan: PORTAL_GROUPS_JS, EXEC_GROUPS_JS, PROJECT_GROUP_JS
src/gas/pres-extra.js   Skrip mode presentasi tambahan (sampul, terima kasih, pustaka PDF, susunan slide)
src/gas/services.js     Tiruan SpreadsheetApp, HtmlService, Utilities, ScriptApp, Session, Logger,
                        CacheService (memori), PropertiesService (persisten), LockService
src/gas/sheets.js       Model Sheet/Range (getValues, setValues, insert/delete rows, hooks)
src/gas/store.js        Penyimpanan spreadsheet di Postgres (gas_sheets jsonb, gas_props, gas_imports),
                        mode data (baca/uji/produksi), integrasi mesin rumus
src/gas/formula.js      Mesin rumus spreadsheet (parser + evaluator + shiftRefs)
src/gas/xlsx-import.js  Membaca .xlsx (tanggal lokal, display, rumus, format, hyperlink)
src/gas/sync.js         Sinkron otomatis dari Google Sheets (cek modifiedTime → export xlsx → ganti data)
src/gas/drive.js        Tiruan DriveApp & UrlFetchApp di atas Drive v3 REST
src/gas/template.js     Kompiler template HtmlService (<? ?>, <?= ?>, <?!= ?>)
src/google/auth.js      OAuth Google (refresh token di tabel google_auth), accessTokenSync()
src/google/sync-http.js HTTP sinkron untuk API lama yang sinkron (worker_thread + Atomics.wait)
src/lib/groups.js       Kelompok proyek (Pengembangan/Rutin/Sub) — tabel project_groups + cache memori
src/lib/access.js       Aturan akses modul/proyek per role
src/routes/gas.js       GET /app (doGet lama), POST /app/rpc/:fn (pengganti google.script.run)
src/routes/admin.js     Kelola Akun, Impor Data, Mode data, Koneksi Google, Kelompok Proyek
src/routes/auth.js      Login/logout/ganti password, lockout
src/routes/login-page.js Halaman login bergaya Apps Script (legacy/Login.html + tambalan)
src/routes/pres.js      API pustaka slide presentasi
db/schema.sql, db/migrations/*.sql   Skema; migrasi dijalankan otomatis saat start (src/migrate.js)
views/                  Halaman EJS milik server baru (admin, login sederhana, privasi, dll.)
deploy/DEPLOY.md        Catatan deploy awal
```

### 3.3 Cara kerja lapisan kompatibilitas
- **Server:** semua file `.gs` digabung sesuai `legacy/order.json` menjadi satu fungsi factory. Factory dipanggil **per request**, jadi variabel global lama selalu baru. Objek tiruan Google disuntikkan sebagai parameter.
- **Data spreadsheet:** dimuat seluruhnya ke memori saat start dari tabel `gas_sheets`. Setelah tiap request, perubahan di-*flush* ke Postgres.
- **Klien:** `google.script.run.fnName(args)` di HTML lama diganti shim yang memanggil `POST /app/rpc/fnName`.
- **Template:** HTML dikompilasi dengan `new Function` + `with` (bukan `vm`, untuk menghindari masalah realm).
- **Mesin rumus:** dihitung ulang sebelum pembacaan berikutnya setelah ada penulisan, meniru Google. Sudah divalidasi: **12.726/12.726 rumus sama** dengan nilai Google, dalam 0,14 detik. Contoh nyata: Input Progress CONVEYOR_UBB minggu 47 menaikkan kumulatif 40,339 → 41,749 (+1,41), sesuai bobot.
- **Mengubah perilaku lama tanpa mengedit `legacy/`:**
  - `BRIDGE_CODE` (di `runtime.js`) mengganti fungsi lama, misalnya `getPortalData`, `getExecutiveDashboardData`, `saveProjectSetup`, `getProjectSetupContext`. Akses ke Node lewat objek `__bridge`, yang menyediakan `user()`, `groups()`, `groupCheck()`, `groupSet()`, `logout()`, dan sebagainya.
  - `HTML_PATCHES` berisi daftar `{file, find, replace}`. Pencocokannya **teks persis**. Kalau `find` tidak ditemukan, server mencatat `gas_patch_miss` di log. **Setelah mengganti file `legacy/` dengan versi Apps Script baru, selalu cek log untuk `gas_patch_miss`.**
  - Isi `BRIDGE_CODE` adalah *template literal*. Garis miring terbalik di regex harus digandakan.

### 3.4 Mode data (halaman Admin → Impor Data → "Mode data")
| Mode | Perilaku |
|---|---|
| **Baca** (default) | Input tetap di Apps Script. Server sinkron otomatis dari Google Sheets tiap 15 menit. Penulisan di server ditolak, kecuali sheet di `GAS_READONLY_WRITABLE`. |
| **Uji coba** | Input di server aktif dan pita oranye "MODE UJI COBA" tampil. Sinkron otomatis berhenti. Kembali ke Baca berarti data uji dibuang dan diganti data Google terbaru (sinkron paksa). |
| **Produksi** | Server menjadi sumber data utama. Sinkron dan impor mati. Untuk pindah ke mode ini harus mengetik `PINDAH`. |

Disimpan di `gas_props` key `SYS:MODE`. Penulisan Drive (`DriveApp`) juga diblok di mode Baca.

### 3.5 Login & akun
- Akun disimpan di tabel `users` (argon2). Role: `admin`, `input`, `kontraktor`, `viewer`, `reviewer`. Ada `project_ids[]`, lockout setelah 5 kali gagal selama 15 menit, dan `must_change_password` untuk password sementara.
- Halaman `/login` memakai tampilan asli `legacy/Login.html`. Perilakunya ditambal di `src/routes/login-page.js`:
  - Submit diarahkan ke `POST /api/auth/login`.
  - "Buat akun" disembunyikan.
  - "Lupa password?" menampilkan pesan untuk menghubungi Admin.
  - `google.script.run` diganti *stub* supaya tidak terjadi loop.
- Fungsi autentikasi lama di Apps Script (`authLogin`, permintaan akun, OTP) **dimatikan** di server. Panel "Permintaan Akun" di Portal dan Executive juga dinonaktifkan.
- Tidak ada OTP untuk admin (keputusan pemilik).

### 3.6 Fitur baru yang dibuat di server (tidak ada di Apps Script)
1. **Admin pages** (`views/pages/*`): Kelola Akun (responsif), Impor Data (unggah .xlsx manual + sinkron + mode data), Koneksi Google (OAuth connect/test/disconnect), **Kelompok Proyek**.
2. **Portal:** kartu proyek memakai **week terakhir yang sudah diisi** (bukan week cut-off bulanan). Baris "Naik … poin" dihapus. Ringkasan atas tetap cut-off bulanan.
3. **Kelompok proyek** (keputusan final pemilik):
   - Tipe: **Pengembangan**, **Rutin**, dan **Sub-proyek**. Sub-proyek adalah investasi rutin di bawah satu proyek Pengembangan induk.
   - **Tidak ada bobot terhadap induk.** Progres, nilai kontrak, dan realisasi keuangan dihitung **sendiri-sendiri**. Pengelompokan hanya untuk tampilan dan laporan.
   - Disimpan di tabel `project_groups`, bukan di spreadsheet, supaya tidak tertimpa saat sinkron. Proyek baru otomatis dianggap Pengembangan.
   - Diatur dari **Tambah / Edit Proyek**, isian "Kelompok proyek" dan "Proyek induk". Yang bisa mengatur adalah siapa saja yang bisa mengedit proyek itu. Halaman **Admin → Kelompok Proyek** berfungsi sebagai rekap.
   - Pengembangan: Plant cost FS **wajib**, IDC dan PM cost FS boleh menyusul.
   - Rutin dan Sub-proyek: cukup nilai kontrak. Plant cost FS diisi otomatis sama dengan nilai kontrak, IDC dan PM cost = 0.
   - Validasi: induk harus Pengembangan, proyek tidak bisa menjadi induk dirinya sendiri, dan proyek yang masih menjadi induk tidak bisa diubah tipenya.
   - Data saat ini: CONVEYOR_UBB adalah sub dari SODA_ASH. CSU_3 adalah Rutin. Sisanya Pengembangan. **Atur ulang di server produksi kalau belum.**
   - Portal: kartu dibagi bagian "Proyek Pengembangan" (label biru) dan "Proyek Investasi Rutin" (label hijau). Sub-proyek diletakkan setelah induknya. Induk yang belum punya data tampil sebagai kartu "Belum ada data".
   - Executive:
     - dua **kartu ringkasan per kelompok** berisi jumlah dan status, realisasi s.d. bulan ini, dan **daftar proyek** (nama, aktual %, status);
     - tabel progres dan tabel **Realisasi keuangan** dikelompokkan, dengan baris **Subtotal** per kelompok dan TOTAL keseluruhan;
     - sub-proyek diberi label "Sub-proyek · [induk]".
4. **Mode presentasi** (Executive & Weekly; tombol layar / tombol **P**):
   - **Sampul** di awal dan **Terima Kasih** di akhir, selalu tetap. Latarnya **foto dari Galeri Foto**: Executive mengambil dari semua proyek, Weekly dari proyek itu saja. Fallback ke foto banner.
   - Tombol **Materi tambahan** (hanya admin/input) berisi tiga tab:
     - **Susunan slide:** tampilkan/sembunyikan dan urutkan slide dashboard bawaan, serta atur posisi slide PDF.
     - **Pustaka PDF:** pustaka bersama. PDF dirender di browser menjadi JPEG 1920 px dan disimpan di DB (tabel `pres_decks`, `pres_pages`). Maksimal 120 halaman.
     - **Sampul & penutup:** teks judul sampul dan kontak penutup.
   - Susunan disimpan per kunci: `executive` atau `weekly:<NAMA PROYEK>`. Layout slide disimpan di `layout:<kunci>`, teks di `_settings`. Semuanya di tabel `pres_sets`.
5. **Banner "MODE UJI COBA"** dan pengalihan `/admin` → `/admin/data`.

### 3.7 Tabel database tambahan
`users`, `sessions`, `audit_log` (dan tabel inti lain di `db/schema.sql`), `google_auth`, `gas_sheets`, `gas_props`, `gas_imports`, `project_groups` (002), `pres_decks`, `pres_pages`, `pres_sets` (003).

---

## 4. Jebakan yang sudah ditemukan (WAJIB dibaca)

1. **Cache SWR browser:**
   - Executive (dan halaman lain yang memakai `pmoSwr`) langsung menggambar data dari cache browser **sebelum** skrip di akhir halaman (Gallery, skrip sisipan) termuat.
   - Kalau data segar dari server sama dengan cache, halaman **tidak digambar ulang**.
   - Akibatnya, apa pun yang bergantung pada skrip belakangan tidak jalan. Contohnya pengelompokan tabel keuangan dan Story Lapangan yang kosong.
   - Solusi yang dipakai: skrip sisipan di akhir halaman memanggil ulang render bila DOM belum diproses. Contoh: `pmoExecGroups(currentReportData)` dan `renderExecStories(...)` jika belum ada `.gl-st`. Placeholder awal `#exStories` berisi teks "Memuat foto lapangan…", jadi jangan cek "children kosong".
2. **Bentrok nama class CSS:** class `.dev` (dan mungkin class pendek lain) sudah dipakai halaman lama untuk pil deviasi (`display:inline-block`). Akibatnya baris tabel rusak. Selalu pakai prefiks unik untuk class baru, misalnya `xg-`, `pg-`, `px-`.
3. **`HTML_PATCHES` mencocokkan teks persis.** Contoh: `ExecutiveDashboard.html` punya dua `</body>`, yang pertama ada di dalam string JS. Selalu pilih `find` yang unik dan cek `gas_patch_miss`.
4. **Template literal di `BRIDGE_CODE`:** `\n` atau `\s` di regex harus ditulis `\\n` / `\\s`.
5. **Mode Baca:** penyimpanan dari Tambah/Edit Proyek, Input Progress, dan lain-lain ditolak. Untuk uji input, pakai mode Uji coba.
6. **Kelompok proyek** ditulis ke DB setelah RPC sukses: `groups.setSync`, lalu `settle()` di `routes/gas.js`. Kalau RPC gagal, `discard()`.
7. **Login legacy:** submit form ditangkap di fase *capture* oleh skrip tambalan. Logika sukses milik Login.html lama **tidak pernah dijalankan**. Relevan untuk animasi stop motion, lihat Rencana R2.
8. **Sinkron data adalah penggantian total** data spreadsheet dari Google. Data uji di server hilang saat kembali ke Baca, dan itu memang disengaja.
9. **Antarmuka file (khusus alur lama dengan Claude):** menyalin ulang file dengan nama/path sumber yang sama kadang terkirim versi lama. Selalu verifikasi isi file di laptop setelah ditulis.
10. Format angka Indonesia (koma desimal). Nama proyek ditampilkan lewat `pmoProjName()`. Nilai keuangan dalam **juta rupiah**.

---

## 5. Cara menguji lokal

```bash
# Postgres lokal (contoh)
pg_ctl -D /tmp/pgt/data -o '-p 5499 -k /tmp/pgt' start
export DATABASE_URL='postgres://postgres@localhost:5499/pmo?host=/tmp/pgt' TZ=Asia/Bangkok PORT=3000 SESSION_SECRET=<acak-32-char>
node src/create-user.js           # buat akun admin uji (lihat isi skrip)
node src/server.js                # migrasi otomatis saat start
# Impor data: login admin → /admin/data → unggah .xlsx ekspor "PMO DASHBOARD" dari Google Sheets
```
- Uji UI dengan Playwright. Contoh skenario yang sudah dipakai:
  - login → `/app?page=portal` dan `/app?page=executive`;
  - `pmoPresentStart()` untuk membuka mode presentasi;
  - halaman Weekly: `/app?page=weekly&project=Dermaga%20A`;
  - Tambah/Edit Proyek: `/app?page=project`.
- Untuk Google Drive, ada server tiruan opsional lewat `GOOGLE_DRIVE_API`, `GOOGLE_TOKEN_URL`, `GOOGLE_CLIENT_ID=x`, `GOOGLE_CLIENT_SECRET=y`.
- Selalu jalankan `node --check` pada file JS yang diubah.

---

## 6. Rencana ke depan (urut prioritas)

### R1 — Sinkronkan pembaca XML Master Schedule (versi Apps Script v243) · **SELESAI (14 Nov 2026, commit `762c563`)**
- `legacy/Code.gs`, `legacy/MasterSchedule.html`, dan `legacy/Login.html` telah disinkronkan dari `docs/apps-script-v243/`.

### R2 — Animasi pembuka "stop motion" Login → Portal · **SELESAI (14 Nov 2026, commit `9aea29a`)**
- Diimplementasikan lewat `src/gas/portal-intro.js`, `src/routes/login-page.js`, `src/routes/gas.js`, `src/gas/store.js`, `src/routes/admin.js`, dan `views/pages/admin-data.ejs` (durasi ~5 detik setelah login sebelum masuk Portal, dapat diaktifkan/nonaktifkan di `/admin/data`).

### Tambahan Selesai 14 Nov 2026 (`bbc0945` .. `ec41c4e`)
- **Pengelompokan & Tampilan Executive/Weekly:** Peta deviasi bulanan, 3-month look ahead, target/milestone, dan kartu realisasi keuangan dikelompokkan per Pengembangan & Rutin; perbaikan tampilan mobile (Weekly `.pmo-cards`, `#pmoGroupSummary` di tab `Ringkasan`, Weekly `#sec-msc` di tab `Kurva S`).
- **Backup & Pemantauan Admin (`/admin/data`):** Ekspor & pulihkan backup `.json` (`src/lib/groups.js`, `src/routes/admin.js`, `views/pages/admin-data.ejs`) dan panel **Kapasitas database** (`pg_database_size` & 8 tabel terbesar).
- **Portal & Narasi Eksekutif Direksi:** Kartu progres Portal memakai data cut-off bulanan dengan judul `Progres Proyek Cut off Bulan <Periode>`; Ringkasan Eksekutif di Portal & Executive menampilkan narasi Direksi (SPI `actual/plan`, CPI, serapan RKAP per kategori, status Proyek Selesai, Fokus Tindak Lanjut Direksi) tanpa kartu KPI atas, tanpa Mode Ringkas, dan tanpa badge `PERLU PERHATIAN`.
- **Presentasi PDF & Kunci Slide Weekly:** Migrasi `db/migrations/004-pres-drive.sql`, `src/google/auth.js`, `src/routes/pres.js` menyimpan slide PDF baru ke Google Drive (`PMO Presentation Slides`), serta `src/gas/pres-extra.js` & `src/gas/runtime.js` memakai kunci `weekly:<PROJECT_ID>` dengan fallback nama lama.

### Perbaikan audit 15 Nov 2026 (Claude)
- Narasi Ringkasan Eksekutif di Executive kini memakai data yang sedang dirender (`window.__pmoBriefData`), sehingga kelompok Pengembangan/Rutin benar (sebelumnya CSU-3 ikut terhitung Pengembangan karena `renderBrief` dipanggil sebelum `currentReportData` diisi).
- Kartu narasi Executive diberi padding (`#xbExec`); kalimat Fokus Tindak Lanjut tidak lagi berakhir "…." atau terpotong di tengah kata.
- Portal: kartu cut-off bulanan **tanpa** baris "Naik … poin" (desktop & HP) — keputusan pemilik.
- Kartu realisasi keuangan per kelompok: nominal ringkas (Rp x,xx T / Rp x,x M; nilai penuh di tooltip).
- Peta deviasi: indentasi sub-proyek dihemat.
- Admin → Kapasitas database: kolom "Jumlah baris" memakai hitungan pasti (`count(*)`).
- **Animasi pembuka diganti video motion graphics** (Remotion) landscape 1920×1080, 10 detik: `public/media/pmo-intro.mp4` (+ poster). Sumber: `OneDrive\Documents\REMOTION PROJECT\vid-remotion`, komposisi `PmoIntroLandscape` (`src/PmoIntroLandscape.tsx`; timeline asli 15 dtk dimampatkan lewat `src/timing.ts`, `TIME_SCALE = 10/15`). Render ulang: `npx remotion render src/index.ts PmoIntroLandscape output/pmo-intro-landscape-10s.mp4 --crf=24`, lalu salin ke `public/media/pmo-intro.mp4`. Diputar tanpa suara (aturan autoplay browser) dengan tombol **Suara** dan **Lewati**; Esc juga menutup; pengaman maksimal 13 detik; `prefers-reduced-motion` → gambar penutup 1,5 detik. Disajikan via `app.use('/media', express.static(public/media))`; Dockerfile menyalin folder `public`.

### R3 — Kelompok proyek tahap 3 · **SELESAI (15 Nov 2026, Claude — lihat bagian di bawah)**
- Laporan Bulanan dan Pelaporan Manajemen dikelompokkan Pengembangan/Rutin. Sub-proyek ditaruh di bawah induk sebagai lampiran, tetap dihitung sendiri-sendiri.
- PIC proyek induk otomatis bisa melihat sub-proyeknya (`src/lib/access.js` dan `userCanAccess_`/`userCanOperateProject_` di bridge).
- Executive versi HP (mode ponsel `mRender`) ikut dikelompokkan.
- Ringkasan hero Portal per kelompok, bila diminta.

### R4 — Uji coba menyeluruh di mode Uji coba
- Pindahkan server ke **Uji coba**. Coba semua modul tulis:
  - Input Progress, EPCC, Dokumen, Engineering, Library, Galeri (unggah foto), Pelaporan Manajemen, Laporan Bulanan, Tambah/Edit Proyek, dan AI (Sena);
  - unggah XML Master Schedule.
- Bandingkan hasil dengan Apps Script. Kembalikan ke Baca bila ada masalah.

### R5 — Cutover ke Produksi
1. Umumkan *freeze* input di Apps Script, misalnya Jumat sore.
2. Admin → Impor Data → **Sinkron sekarang**, lalu verifikasi angka Portal dan Executive sama dengan Apps Script.
3. Pindah mode ke **Produksi** (ketik `PINDAH`).
4. Apps Script lama: tampilkan pesan "Aplikasi pindah ke pmopetrokimia.tech" atau batasi akses (deployment read-only).
5. Pantau log dan backup harian di minggu pertama.

### R6 — Operasional & keamanan
- **Uji restore backup R2 (selesai 14 Nov 2026):** Diuji ke database sementara `pmo_restore_test` pada container `ffqpcdob9wkuacesuueycolv` (`postgres:18-alpine`) dari file `.dmp` terbaru di `/data/coolify/backups/databases/root-team-0/pmo-db-ffqpcdob9wkuacesuueycolv/`. Hasil bersih tanpa error (`users=27`, `sheets=43`, `groups=7`), lalu `pmo_restore_test` dihapus kembali:
  ```bash
  DB=ffqpcdob9wkuacesuueycolv
  BK=$(ls -t /data/coolify/backups/databases/root-team-0/pmo-db-$DB/*.dmp | head -n 1)
  docker exec -i $DB psql -U postgres -c "DROP DATABASE IF EXISTS pmo_restore_test;"
  docker exec -i $DB psql -U postgres -c "CREATE DATABASE pmo_restore_test;"
  docker exec -i $DB pg_restore -U postgres -d pmo_restore_test --no-owner --no-acl < "$BK"
  docker exec -i $DB psql -U postgres -d pmo_restore_test -c "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM gas_sheets) AS sheets, (SELECT count(*) FROM project_groups) AS groups;"
  docker exec -i $DB psql -U postgres -c "DROP DATABASE pmo_restore_test;"
  ```
- **Healthcheck Coolify (selesai 14 Nov 2026):** Diaktifkan di `pmo-web` → Healthcheck (`GET http://localhost:3000/health`, expected `200`, start period `30s`).
- Opsional: proxy Cloudflare (oranye) di depan VPS. Uji dulu karena SSL dan Traefik sudah benar.
- Domain profesional lewat tim IT. Cukup ganti DNS, `APP_BASE_URL`, dan redirect URI OAuth di Google Cloud.
- Akun Google untuk Drive saat ini Gmail pribadi. Bisa diganti nanti lewat Admin → Koneksi Google, dan folder Drive harus dibagikan ke akun baru.

### R7 — Hal kecil yang tercatat · **SELESAI (14 Nov 2026, commit `d0f026e` .. `ec41c4e`)**
- Slide PDF presentasi baru dipindahkan ke Google Drive (`PMO Presentation Slides`) via `db/migrations/004-pres-drive.sql` & `src/routes/pres.js` (slide lama di DB tetap dilayani).
- Kunci susunan slide Weekly menggunakan `weekly:<PROJECT_ID>` dengan fallback `weekly:<NAMA_PROYEK>` di `src/gas/pres-extra.js`, `src/gas/runtime.js`, dan `src/routes/pres.js`.
- Kartu Portal memakai data cut-off bulanan dengan judul `Progres Proyek Cut off Bulan <Periode>`.
- Ringkasan Eksekutif (Portal & Executive) memakai narasi Direksi dengan SPI (`actual/plan`), CPI, dan serapan RKAP per kategori Pengembangan & Rutin.
- Pemantauan kapasitas database (`pg_database_size` & 8 tabel terbesar) tersedia di `/admin/data`.


### Tema warna + navigasi Tipe A · 15 Nov 2026 (Claude)
- **Tema mode terang:** Biru (bawaan), Sage (hijau), dan Mocha (coklat). Semuanya ada di `src/gas/nav-theme.js`.
  - `<html data-accent>` diisi server di `<head>`, sehingga tidak ada kedipan warna. Variabel `--bg/--card/--ink/--pri/...` ditimpa dengan selektor `html[data-accent=..]:not([data-theme=dark])`. Mode gelap tidak berubah.
  - Sidebar berwarna gelap di mode terang untuk ketiga tema: biru `#0B3A66`, sage `#0F2A1D`, mocha `#3B2A1F`. Variabelnya di-scope ke `aside.side`.
  - Hero/banner ikut tema hanya di halaman `portal, executive, weekly, input, project, monthly` (lewat atribut `data-page`). Master Schedule memakai class `.hero` untuk banner terang, jadi jangan disamakan.
  - Pilihan per akun ada di menu akun → "Warna tema". Nilainya tersimpan di kolom `users.ui_accent` (`db/migrations/005-ui-accent.sql`) melalui `POST /api/prefs/accent`.
  - Tema bawaan untuk akun yang belum memilih diatur Admin di `/admin/data` (`gas_props 'SYS:ACCENT'`, `POST /api/admin/accent`).
- **Navigasi Tipe A:**
  - **Sidebar akordeon** (patch ke `setupModularSidebar` di AccountMenu, `NAV_PATCHES`): grup halaman aktif terbuka, sedangkan membuka satu grup menutup grup lain. M1 tetap selalu terbuka. Judul grup ditulis utuh.
  - **Grup "Isi halaman"** disembunyikan dari sidebar dengan CSS, tetapi tetap ada di DOM karena dipakai menu HP (`isiItems()`). Gantinya adalah baris `#pmoPbar` yang menempel di bawah header: breadcrumb, tab EPCC (Engineering/Procurement/Construction/Commissioning), dan chip isi halaman yang memanggil `.click()` tombol aslinya.
  - **Tab EPCC:** di halaman `epcc`, berpindah bidang memakai tombol `data-field` bawaan halaman (tanpa reload) dan URL `field=` ikut diperbarui. Dari Engineering, tab berpindah halaman lewat `pmoGoWithProject`.
  - **HP (≤760px):** baris ini hanya tampil di halaman EPCC (tab saja). Isi halaman tetap ada di dok bawah.
- **Menu melayang saat sidebar diciutkan** (`.app.collapsed`):
  - Arahkan kursor atau fokus ke grup, lalu panel `.pmo-fly` muncul di kanan sidebar berisi daftar halaman grup itu. Klik pada panel menjalankan `.click()` tombol aslinya.
  - Panel memakai `position:fixed`, karena sidebar memakai `overflow:hidden`.
  - Tombol panah kanan masuk ke panel, Esc menutupnya. Panel tidak dipakai di HP.
- **Ctrl K:**
  - Pencarian (AccountMenu & PmoUi, patch `collect()`) sekarang memuat daftar halaman lengkap sesuai hak akses akun (`pmoNavExtra` di nav-theme.js), ditambah "Isi halaman ini" dari halaman aktif.
  - Kata kunci Indonesia ikut dicari, misalnya "pengadaan" menemukan Procurement dan "cctv" menemukan Live View.


### Peningkatan Sena · 15 Nov 2026 (Claude)
Semua perubahan ada di `src/gas/sena-extra.js`: `SENA_BRIDGE` dijalankan setelah `BRIDGE_CODE`, dan `SENA_PATCHES` dimasukkan ke HTML_PATCHES.
- **Klarifikasi:**
  - Alat baru `tanya_balik`. `aiCall_` dibungkus: bila Claude memanggil alat ini, `askAssistant` mengembalikan `{clarify:{question, options}}`.
  - Widget menampilkan tombol pilihan. Status di log `KLARIFIKASI`, sehingga tidak dihitung kuota.
- **Tautan "Buka di halaman":**
  - Claude menulis `[[teks|KODE|BIDANG|PROYEK_ID]]`, dengan BIDANG = ENG/PROC/CONS/COM/DOC/WEEKLY.
  - Server hanya menerima KODE yang muncul di hasil alat. Pemeriksaannya lewat `aiRunTool_` yang dibungkus untuk mencatat nilai `id/kode/no/nomor`. Kode karangan berubah jadi teks biasa.
  - Respons berisi `answer` (teks polos untuk riwayat dan suara), `answerLinked` (berpenanda ⟦Ln⟧), dan `links[]`.
- **Sorot item:** URL `?sena=<kode>` ditangani di nav-theme.js (`senaFocus`): cari baris berisi kode → buka tab "Item…/Dokumen" → isi kotak cari halaman → sorot. Bila tetap tidak ketemu setelah 14 detik, muncul toast.
- **Draf:**
  - Tombol "Buat draf" di atas kotak tanya mengirim `req.draft` = `ringkasan | concern | highlight | email`. Prompt mode draf mengatur format.
  - Jawaban tampil di textarea yang bisa diedit, dengan tombol Salin. Draf memakai kuota.
- **Peringatan dini** (`getNotifications` dibungkus, kind `alert`, hanya ADMIN/INPUT/PIC, cache `perfCached_('senaAl|…')`):
  - deviasi memburuk 3 minggu berturut-turut (dan sudah negatif);
  - grup "lintasan kritis" CPM dengan item tertinggal (perlu sheet LOGIKA terisi);
  - dokumen engineering menunggu review > 14 hari;
  - jaminan berakhir ≤ 30 hari (digabung per proyek).

  Setiap peringatan punya `action` (+ `sena` untuk sorot) dan `ask` untuk tombol "Tanya Sena" (tombol hanya muncul bila akun punya akses Sena).
- **Akses Sena:**
  - Kolom `users.sena_access` (`db/migrations/006-sena-access.sql`) dicentang di Kelola Akun ("Akses Sena"), misalnya untuk direktur.
  - `aiIsAdmin_` diganti: ADMIN atau `senaAccess`. Data tetap dibatasi `userCanAccess_` akun tersebut.
- **Perbaikan kuota:** sebelumnya kuota harian tidak pernah bertambah, karena status log `OK · n putaran` ≠ `OK`. Sekarang dihitung lewat `aiLog_` yang dibungkus.
- **Uji lokal tanpa kunci asli:**
  - set `ANTHROPIC_API_KEY=apa-saja` dan `SENA_TEST_API_URL=http://127.0.0.1:4555/v1/messages` (hanya alamat localhost yang diterima), lalu jalankan server Claude tiruan;
  - JANGAN isi `SENA_TEST_API_URL` di Coolify.


### Sena v2 · 24 Nov 2026 (Claude)
- **Jalur baru, async:** `POST /api/sena/ask` (ADMIN atau `sena_access`) → `{jobId}`, lalu widget polling `GET /api/sena/job/:id` tiap 1,5 dtk (`src/routes/sena.js`, `src/lib/sena.js`). Panggilan Claude memakai `fetch` Node, jadi server tidak lagi terblokir oleh `UrlFetchApp` sinkron. `askAssistant` lama sengaja dimatikan (pesan "muat ulang halaman").
- **Mode & model** (`pickMode`): `cepat` → Haiku 5.5, effort low, max 3000; `analisis` → Sonnet 5.5, medium, 10000; `rapat` → Sonnet 5.5, high, 16000. Tombol "Bahan rapat" di widget memaksa mode rapat.
- **Anti jawaban kosong:** bila putaran terakhir terpotong/kosong, satu panggilan tambahan tanpa tool ("Data sudah cukup. Tulis jawaban akhir…").
- **Tool baru:** `paket_rapat` (ringkasan + K3, slide progres & 3MLA, item terlambat/kritis, dokumen engineering menunggu lama, jaminan/asuransi, isu, tindak lanjut MoM, surat terbaru) dan `cari_dokumen` (indeks teks dokumen).
- **Tombol "Jadikan isu manajemen"** di jawaban mode rapat → `POST /api/pres/issues`.
- **Kuota & biaya:** tabel `ai_usage` (`db/migrations/016-sena.sql`) mencatat token & USD tiap pertanyaan; yang dihitung kuota hanya status OK. Batas 5/hari per akun dan anggaran 10 USD/bulan (WIB) diperiksa sebelum bertanya.
- **Indeks dokumen** (`src/lib/doctext.js`, tabel `doc_text`): Kontrak, Addendum, OK, MoM, Surat masuk/keluar, Asuransi (PDF Drive). Teks pdf.js; halaman hasil scan di-OCR Tesseract (±6 dtk/halaman, maks 40 halaman OCR). Jalan otomatis 3 menit setelah start lalu tiap 10 menit, 3 dokumen per putaran. Status: `GET /api/sena/status` (admin), paksa: `POST /api/sena/index`.

### Input Progress Mingguan · unggah video/materi + input kontraktor · 25 Nov 2026 (Claude)
- **Unggah file** (tombol di samping "Cek link"): video MP4/MOV/M4V/WEBM maks 2 GB, materi PDF/PPT/XLS/DOC maks 200 MB.
  - Browser mengirim file **langsung ke Google Drive akun tim proyek** (sambungan menu Arsip, tabel `google_project_auth` + folder tujuan), per potongan 16 MB. Isi file tidak lewat VPS.
  - Jeda / Lanjut / Batal; koneksi putus → menunggu lalu bertanya ke Google sudah sampai byte berapa dan melanjutkan. Peringatan bila tab ditutup saat unggah.
  - Sisa ruang Drive akun tim dicek sebelum mulai. File disimpan di `<folder tujuan>/W<n>/W<n> - Video - <nama>.mp4`, akses "siapa saja yang memiliki link", link terisi otomatis.
  - Server: `src/lib/weekly-upload.js`, `src/routes/weekly-upload.js` (`GET /api/weekly-upload/status`, `POST /api/weekly-upload/session`, `POST /api/weekly-upload/done`). Memakai helper `src/arsip/service.js` (token, gapi, subFolder, shareAnyone).
  - Tabel `weekly_uploads` (`db/migrations/017-weekly-upload.sql`): BARU → AKTIF / DIBUANG. Setelah `submitWeeklyInput` berhasil (`routes/gas.js`), file minggu itu yang tidak dipakai di sel mana pun dan tidak dipakai kiriman kontraktor yang menunggu **dipindah ke sampah Drive**.
  - Hak unggah: ADMIN, PIC/INPUT proyeknya (PROYEK_ID akun), KONTRAKTOR proyeknya.
- **Kontraktor** boleh membuka Input Progress Mingguan untuk proyeknya (`KONTRAKTOR_PAGES` + gerbang `ktr-access.js` + menu "Input HSE & Video Mingguan"):
  - hanya bagian HSE dan video/materi; progres, concern, highlight disembunyikan. Tombol "Kirim ke PIC / Admin" → `submitKtrWeekly` → tabel `ktr_weekly` (status BARU).
  - Form PIC/Admin untuk minggu itu otomatis memuat kiriman (banner "Kiriman kontraktor…"); setelah PIC/Admin menyimpan, kiriman ditandai DIPAKAI (`payload.ktrDraftAt`).
  - Kontraktor tetap tidak bisa memanggil `submitWeeklyInput` maupun API Input Progress Bulanan.
  - Berkas: `src/gas/weekly-upload.js` (GS + patch InputApi/InputProgress/AccountMenu), `src/gas/ktr-access.js`, `src/gas/nav-theme.js`.
- Uji lokal: `GOOGLE_DRIVE_API`, `GOOGLE_DRIVE_UPLOAD`, `GOOGLE_TOKEN_URL` diarahkan ke server Drive tiruan.

### R3 + presentasi bertema + slide video · 15 Nov 2026 (Claude)
- **R3** (`src/gas/groups-r3.js`):
  - **Hak ubah PIC/INPUT** (bridge `userCanOperateProject_`):
    - semua proyek di `project_ids`; sebelumnya hanya proyek pertama, karena `legacyUser` hanya mengirim satu `projectId`. Sekarang `projectIds` ikut dikirim;
    - sub-proyek dari induk yang dipegang.
  - **Pilihan proyek dikelompokkan:** optgroup "Proyek Pengembangan" / "Proyek Investasi Rutin", sub-proyek dengan tanda "↳" di bawah induknya, atau "(sub-proyek INDUK)" bila induk tidak ada di daftar. Berlaku di halaman `monthly`, `report`, `monthlydoc`, `weeklyprint`, dan `input`. Snippet disisipkan oleh `wrapPage` lewat `opts.page`.
  - **Kartu `#pmoSubx`** di Laporan Bulanan, Pelaporan Manajemen, dan Buat Laporan Bulanan:
    - induk → "Lampiran sub-proyek" dengan tombol "Buka laporannya";
    - sub → "Sub-proyek dari …" dengan tombol "Buka laporan induk".
  - **Executive versi HP:** `mRender` dibungkus. Kartu proyek dikelompokkan dan sub-proyek diberi label (memakai `pmoExecOrder`).
  - Ringkasan hero Portal per kelompok belum dibuat (opsional, bila diminta).
- **Mode presentasi ikut tema** (`presCss()` di nav-theme.js): lapisan `.pp`, layar pembuka `.pp-boot`, sampul/penutup `.px-*`, panel Materi tambahan, dan teks sorotan banner (`.hero h1 span`) memakai warna Sage/Mocha. Tema Biru dan mode gelap tidak berubah.
- **Slide video proyek di presentasi Executive** (`src/gas/pres-video.js`, `pres-extra.js`, `routes/pres.js`):
  - Fungsi Apps Script baru `getPresVideoOptions` (ditambahkan ke kode saat runtime dimuat) membaca `LINK_VIDEO` DATA MINGGUAN per proyek per minggu.
  - Di Materi tambahan → Susunan slide → "Slide video proyek": pilih proyek dan minggu. Item disimpan di `pres_sets` sebagai `{type:'video', project, week, pos, title}`.
  - Slide memakai iframe Drive preview, YouTube (nocookie), OneDrive embed, atau `<video>` mp4. Iframe hanya dipasang saat slide aktif, sehingga video berhenti saat slide berpindah.


### Video pembuka & CCTV jaringan internal · 15 Nov 2026 (Claude)
- **Video pembuka** (`portal-intro.js`, `login-page.js`):
  - Video diunduh lebih awal di halaman Login, sehingga cache sudah terisi sebelum Portal dibuka.
  - Selama video belum siap, tampil penanda "Memuat…" di atas poster.
  - Intro dilewati bila video belum mulai dalam 4 detik, tersendat lebih dari 3 detik, galat, atau browser melarang putar otomatis. Batas keras 14 detik.
  - Sumber video dipasang lewat `v.src` (bukan `<source>`), supaya event `error` terdeteksi.
- **CCTV pilihan A** (`src/gas/live-lan.js`):
  - Jenis **Tautan** boleh memakai `http://` khusus alamat LAN (10.x, 172.16–31.x, 192.168.x). Patch ini diterapkan ke `LiveApi.gs` lewat mekanisme baru **GS_PATCHES** di runtime.js.
  - Halaman Live View menampilkan pesan "jaringan internal perusahaan" dengan tombol "Buka NVR di tab baru".
  - Pada mode **Baca**, kamera ditambahkan sebagai baris baru di sheet `CCTV` di Google Sheets. Validasi `http` di Apps Script lama tidak ikut berubah, jadi jangan menambah lewat aplikasi lama.
  - Pilihan B (jembatan RTSP→HLS + Cloudflare Tunnel) menunggu data dari tim CCTV/IT: merek/model NVR, port RTSP, akun lihat-saja, daftar channel, dan izin IT.


### Sidebar ciut rapi + video pembuka versi HP · 16 Nov 2026 (Claude)
- **Sidebar diciutkan** (`.app.collapsed`, nav-theme.js):
  - Hanya tampil satu tombol ikon per grup (M1/M3/M2·M4/M5/INPUT), item halaman disembunyikan. Grup aktif disorot `.pmo-act`.
  - Klik, Enter, atau arahkan kursor ke ikon grup membuka menu melayang `.pmo-fly` berisi halaman grup itu. Scrollbar disembunyikan.
- **Video pembuka versi tegak:**
  - File `public/media/pmo-intro-portrait.mp4` (1080×1920, 10 detik, ±2 MB), dengan poster dan gambar akhir `pmo-intro-portrait-*.jpg`.
  - Dipakai bila layar portrait dan lebar < 900px. Ditampilkan dengan `object-fit:contain` di atas latar gradasi yang senada.
  - Sumbernya komposisi Remotion `PmoDashboardMotion`, sekarang 10 detik dengan musik fade-out 1 detik. Render ulang dengan perintah:
    `npx remotion render src/index.ts PmoDashboardMotion output/pmo-intro-portrait-10s.mp4 --crf=26`.


### Arsip Materi Weekly · 16 Nov 2026 (Claude)
Tujuan: video dan materi weekly yang tautannya mengarah ke Drive kontraktor atau perorangan disalin ke Drive tim proyek, supaya tautan tidak putus kalau kontraktor menghapus atau memindah file.

**Lokasi dan hak akses**
- Halaman `/arsip`, ada di menu akun dan header admin.
- Hanya Admin, atau PIC proyek itu. PIC dari proyek induk juga boleh untuk sub-proyeknya.
- File terkait: `src/arsip/service.js`, `src/routes/arsip.js`, `views/pages/arsip.ejs`, `db/migrations/007-arsip.sql`.

**Alur**
1. PIC menghubungkan akun Google **tim proyek** per proyek (tabel `google_project_auth`). Callback OAuth: `/arsip/google/callback`, wajib ditambahkan ke Authorized redirect URIs di OAuth client Google Cloud.
2. PIC memilih folder tujuan. Sistem memeriksa bahwa akun tim boleh menambah file ke folder itu.
3. Inventaris dibaca dari LINK_VIDEO dan LINK_MATERI di DATA MINGGUAN PROYEK. Status tiap tautan:
   - `tim`: pemiliknya akun tim, dilewati;
   - `salin`;
   - `onedrive` / `akses` / `folder` / `lain`: unggah manual.
   Sisa kuota Drive dicek dan proses ditolak kalau ruangnya kurang.
4. Proses latar belakang menjalankan langkah berikut per file:
   - `files.copy` di dalam Google (tidak lewat VPS) ke subfolder per minggu, misalnya `W103/`;
   - izin "anyone with link: reader";
   - verifikasi salinan;
   - ganti tautan sel.
   File yang sama di beberapa sel disalin sekali saja.
5. Ganti tautan:
   - selalu ditulis ke data server (store + flush);
   - kalau mode bukan `produksi` dan Koneksi Google utama aktif, juga ditulis ke Google Sheets induk (`spreadsheets.batchUpdate` updateCells, link sel), supaya sinkron 15 menit tidak mengembalikan tautan lama.
6. Riwayat disimpan di `arsip_items`, yang berisi tautan lama dan baru. Tombol "Pulihkan tautan lama" mengembalikan sel yang tautannya masih menunjuk ke salinan. Salinan di Drive tidak dihapus.
7. Unggah manual: server membuat sesi *resumable upload* (header Origin), lalu browser mengunggah langsung ke Google, bukan lewat VPS. Setelah itu `upload-done` mengganti tautan.

**Uji lokal:** env `GOOGLE_DRIVE_API`, `GOOGLE_DRIVE_UPLOAD`, `GOOGLE_SHEETS_API`, `GOOGLE_TOKEN_URL` dan `GOOGLE_USERINFO_URL` bisa diarahkan ke server tiruan.


### Presentasi Bergerak · 16 Nov 2026 (Claude)
- **File:** `src/gas/pres-motion.js` (`PRES_MOTION_JS`), disisipkan setelah `PRES_EXTRA_JS` di AccountMenu.
- **Kaitan:** patch pada `go(n)` di `pmoPresent` memanggil `pmoMotion.enter(card)` setiap kali slide tampil. Animasi menunggu sampai overlay presentasi tampil penuh (`.pp.on`).
- **Cara kerja:** Web Animations API langsung pada card yang dikloning ke slide, tanpa pustaka tambahan.
  - Blok dan kartu muncul bertahap.
  - Angka ≥17px naik dari 0 dengan format Indonesia tetap. Teks asli dikembalikan setelah selesai (atribut `data-pm-txt`).
  - Garis SVG tergambar lewat stroke-dashoffset, area SVG memudar masuk, dan rect SVG tumbuh (scaleY dari bawah, atau scaleX untuk batang horizontal).
  - Lingkaran ber-dasharray mengisi.
  - Bilah HTML dengan `width:%` tumbuh (scaleX).
  - Label status meletup.
- **Dilewati:** slide PDF, video, dan sampul (`.px-pdf`, `.px-video`, `.px-hero`).
- **Kontrol:**
  - Tombol "Animasi" di toolbar presentasi, tersimpan di `localStorage` dengan key `pmoMotion` (0 = mati).
  - Tombol **R** memutar ulang animasi slide.
  - Animasi otomatis mati bila perangkat memakai `prefers-reduced-motion`.
- **Pengaman isi slide tertahan:**
  - Setiap pindah slide, semua animasi gerak di overlay presentasi dibersihkan (`sweep`, ditandai `a.__pm`).
  - Animasi dipaksa selesai paling lambat pada akhir durasi + 0,5 detik (maks 4,5 detik).
  - Kalau animasi tidak sempat diputar, isi slide dimunculkan setelah 3,5 detik.
  - Animasi juga dibersihkan saat tab kembali aktif.
  - Overlay `.pp` lama dihapus sebelum overlay baru dibuat.
- **Slide proyek Executive:** chip `.pp-per` "Cut-off W<n> · <tanggal awal> – <tanggal akhir minggu itu>" di samping judul. Rentang tanggal dari field `cutRange` (GS_PATCHES di `live-lan.js`, dihitung dari tanggal mulai proyek).
- **Lisensi:** sengaja tidak memakai Remotion Player, karena untuk perusahaan 4+ orang wajib Company License dengan minimum $100/bulan.


### Siapkan presentasi · 16 Nov 2026 (Claude)
- **File:** `src/gas/pres-prep.js` (`PRES_PREP_JS`), disisipkan setelah PRES_EXTRA_JS dan PRES_MOTION_JS.
- **Tombol Presentasi** membuka layar persiapan dulu. Caranya lewat patch di `open(cfg)` AccountMenu: kalau `!cfg.direct` dan `pmoPresPrep.want()`, yang dipanggil `pmoPresPrep.show(cfg)`.
- **Tombol P** langsung memulai presentasi (`window.__ppDirect`). Pilihan "Lain kali langsung mulai" disimpan di `localStorage` dengan key `pmoPresSkip`.
- **Isi layar persiapan:**
  - satu daftar terpadu: sampul, slide dashboard, halaman PDF, video, dan terima kasih;
  - urutan diubah dengan seret atau ↑↓;
  - slide dashboard bisa disembunyikan lewat centang, slide tambahan dihapus dengan ×;
  - pratinjau di kanan, termasuk isian teks sampul dan penutup.
- **Menyimpan susunan:** posisi slide tambahan diturunkan dari urutan daftar menjadi `pos` (`start` / `after:<judul slide dashboard>`), lalu dikirim lewat `PUT /api/pres/set`. Format datanya tidak berubah.
- **Saat mulai:** daftar final dikirim sebagai `cfg.__final`. Patch `decorate` di `open()` memakai daftar ini langsung, tanpa membangun ulang.
- **Ubah susunan:** tombol toolbar `data-a="extra"` menutup presentasi lalu membuka layar persiapan pada slide yang sedang tampil (`pmoPresPrep.reopen`).
- **Tambah PDF** memakai panel pustaka lama dalam mode pilih: `pmoPresExtra.manage(cfg,{onAdd})`, dengan tab dan tombol simpan disembunyikan.
- **Hak akses:**
  - Admin dan PIC bisa menyimpan susunan. `canManage` di `routes/pres.js` sekarang mensyaratkan `role admin`, atau `role input` dengan `legacy_role PIC`.
  - Akun lain tetap bisa mengatur susunan, tapi hanya untuk sesi itu (tidak disimpan).


### Portal = posisi paling update; Executive menjadi "Monthly Executive Review" · 16 Nov 2026 (Claude)
Masukan Direktur Pengembangan: saat portal dibuka, progres aktual vs plan dan resume pekerjaan tiap proyek di minggu terakhir yang diinput harus langsung terlihat.

**Pembagian peran halaman**
- **Portal:** tiap proyek memakai minggu terakhir yang sudah diinput (bisa berbeda antar proyek). Tidak ada rata-rata portofolio.
- **Monthly Executive Review** (`?page=executive`, alamat tidak berubah): cut-off bulanan, SPI/CPI rata-rata, serapan RKAP.

**Portal** (`src/gas/portal-latest.js`, disisipkan lewat `PORTAL_GROUPS_JS`; patch `PORTAL_LATEST_PATCHES`)
- Server: `getPortalData` (BRIDGE di runtime.js) mengirim `lw` per proyek: `week, from, to, actual, plan, deviation, status, highlight, lines[], prev{week,actual}, cause{field,concern,mitigation}, stale`.
  - `stale` = jumlah minggu sejak akhir minggu terakhir yang diinput, diisi bila ≥ 2.
- Urutan halaman: Story Lapangan → Ringkasan → Kartu proyek (revisi 17 Nov).
- Kartu (`pmoPortalLatest`, `pmoPortalAfter`): bentuk kartu seperti semula (highlight 3 baris, tanpa "Selengkapnya"), urutan sesuai kelompok Pengembangan lalu Rutin. Tambahannya hanya: angka dan status dari `lw`, label "W104 · 4–10 Nov", baris "+x poin dari W<n-1>", dan tanda "Input terakhir n minggu lalu".
- Ringkasan (`pmoPortalBrief`), revisi 17 Nov: narasi per proyek dalam `<details>` yang bisa dilipat (proyek at risk / critical terbuka otomatis).
  - Kalimat kepala: "sampai dengan minggu ke-n <bulan> (W..): progres fisik x% dari rencana y% (deviasi, status)". Minggu ke-n = ceil(tanggal akhir minggu / 7).
  - Isi: aktivitas utama (3 butir highlight pertama), kendala + tindak lanjut (hanya bila deviasi < 0), target milestone bulan berikutnya + statusnya (`brief.msMap`, dari `PROGRESS_MILESTONE_MONTHLY`), keuangan s.d. akhir bulan cut-off = realisasi dan % terhadap RKAP tahunan (`brief.finRows`).
  - Per kelompok: total serapan RKAP tahunan. SPI/CPI tidak ditampilkan di portal; ada tautan ke Monthly Executive Review.
  - Nilai progres dan % RKAP dicetak tebal berwarna (`.xpl-v`).
- **Narasi Ringkasan Eksekutif di Monthly Executive Review** (revisi 17 Nov, `grpMemo` di `EXEC_BRIEF_NARR_JS`, runtime.js): blok bernomor per kelompok ("1. Proyek Pengembangan", "2. Proyek Investasi Rutin").
  - Paragraf: cut-off bulan, jumlah dan nama proyek berjalan, yang at risk / critical, SPI dan CPI rata-rata (kepanjangan hanya di blok pertama), total serapan RKAP tahunan "(nilai yang dikelola Dashboard)", lalu tautan gulir ke `#sec-progress` dan `#financeDetailSection`.
  - "Yang perlu diperhatikan": satu butir per proyek dengan deviasi negatif (minggu cut-off + rentang tanggal dari `cutRange`, deviasi poin, perkiraan minggu, plan vs aktual, kendala, tindak lanjut) dan satu butir serapan RKAP di bawah rencana.
  - Nilai dicetak tebal berwarna lewat kelas `.xv` (ada varian tema gelap).
- Hero di bagian paling atas portal belum diubah (masih angka cut-off bulanan).

**Ganti nama**
- Di `runtime.js`, setelah semua patch HTML: semua teks "Executive Dashboard" di file HTML dan .gs diganti "Monthly Executive Review". File `legacy/` tidak diubah.
- `nav-theme.js` (Ctrl K) ikut diganti.
- Menu "Buat Laporan Bulanan" menjadi "Buat Laporan Bulanan (dokumen)".


### Tindak lanjut audit SEO/keamanan (paket 1) · 17 Nov 2026 (Claude)
Keputusan pemilik: dashboard internal **tidak diindeks** mesin pencari; alamat utama **tanpa www**; pratinjau tautan (Open Graph) dipasang.
- `server.js`:
  - header `X-Robots-Tag: noindex, nofollow` dan `Permissions-Policy` (mikrofon tetap `self` karena dipakai input suara Sena);
  - `/robots.txt` berisi `Disallow: /`;
  - host `www.` dialihkan 301 ke origin `APP_BASE_URL` (GET/HEAD);
  - galat di `/app/rpc/*` dibalas JSON seperti `/api/*`;
  - `POST /login` (form tanpa JavaScript) dialihkan 303 ke `/login`.
- `routes/brand.js` (baru): `/media/brand/{logo.png,login-bg.jpg,icon.png,petro.png}`. Server mengambil gambar dari thumbnail Drive sekali, menyimpannya di disk (`BRAND_CACHE_DIR`, bawaan folder tmp) dan memori, lalu menyajikannya dengan cache 7 hari. Kalau gagal, browser dialihkan 302 ke sumber Drive dan server mencoba lagi setelah 5 menit. `/favicon.ico` mengarah ke `icon.png`.
- `routes/login-page.js`:
  - judul, deskripsi, `noindex`, canonical, ikon tab, preconnect font, Open Graph dan Twitter Card (gambar `/media/pmo-intro-poster.jpg`);
  - logo dan latar login dari `/media/brand/`;
  - `method="post"` pada form;
  - karakter nyasar setelah `</html>` dibuang;
  - CSS: kartu muat di layar pendek (≤800px) tanpa dua scrollbar, tombol tema mengecil dan tidak menimpa logo di HP;
  - video pembuka diunduh sekali lewat `<link rel="prefetch">`.
- Paket 2 (17 Nov): logo PMO, logo Petrokimia, ikon tab, dan gambar latar yang ditulis tetap di halaman dashboard juga disajikan dari `/media/brand/`. Caranya: `brand.rewrite()` mengganti tautan thumbnail Drive untuk ID yang dikenal saat halaman lama dimuat (runtime.js), dan ikon tab diganti di `routes/gas.js`. Foto lapangan dan banner proyek (isi dinamis) tetap dari Drive.
- Judul utama halaman login diberi teks lengkap untuk pembaca layar (`.pmo-sr`), tampilan tidak berubah.
- **CSP mode lapor saja** (17 Nov), file `src/routes/csp.js`:
  - Header `Content-Security-Policy-Report-Only` di semua respons, dengan daftar sumber yang dipakai dashboard: Drive/Docs, YouTube, Office viewer, OneDrive/SharePoint, cdnjs/jsdelivr, Google Fonts, googleapis untuk unggah arsip, vesselfinder/flightradar24.
  - Hanya `report-uri /api/csp-report`. `report-to` sengaja tidak dipakai, karena membuat Chrome mengabaikan report-uri dan mengirim laporan tertunda.
  - Laporan diringkas per (directive, origin sumber, halaman) di tabel `csp_reports` (migrasi 008, maks 500 baris; batas 120 laporan/menit per IP; laporan dari ekstensi browser diabaikan).
  - Admin melihat dan mengosongkan catatan di `/admin/csp` (menu header "Laporan CSP").
  - Env: `CSP_MODE=report|enforce|off`, `CSP_EXTRA_FRAME` (sumber frame tambahan, mis. alamat NVR CCTV).
  - Uji lokal: Portal, Monthly, Weekly, Input, Live, dan presentasi tidak menghasilkan laporan.
- ~~Belum dikerjakan: penegakan CSP; logo login terpotong.~~ Logo login sudah disesuaikan pemilik (pertahankan versi sekarang). Daftar sumber CSP dilengkapi 22 Nov (lihat Riwayat perubahan); penegakan menunggu laporan sepi.
- **Kontraktor · dokumen EPCC** (18 Nov), `src/gas/ktr-docs.js` (patch .gs + HTML). Kontraktor dengan bidang **ENG**: Engineering › Dokumen boleh *Tambah lampiran* (link / unggah) dan *Link massal* (template Excel); pindai folder Drive tetap ADMIN/tim proyek; hapus hanya lampiran miliknya (`byU`). Kontraktor bidang **PROC**: Long lead & impor boleh *Isi jadwal / Ubah* (PO, FAT, FOB, ETA, MOS, vendor/negara, tanggal aktual) dan Pengiriman boleh *Tambah dari dokumen FOB* / *Perbarui status / ETA* (termasuk baca otomatis B/L / AWB); hapus pengiriman tetap ADMIN/tim proyek. Isian langsung tersimpan (bukan pengajuan), tercatat atas nama akun kontraktor. Flag tampilan: `canEngDocs`, `canProcDocs`.
- **Kontraktor · akses halaman** (18 Nov), `src/gas/ktr-access.js` + `routes/gas.js` (KONTRAKTOR_PAGES) + `routes/model3d.js`. Kontraktor kini boleh membuka (khusus proyeknya): Portal, **Weekly Progress**, EPCC, **Live View CCTV**, **Spotlight Lobby**, **Visual 3D** (lihat + unggah; ganti/ubah/hapus/unduh hanya model unggahannya sendiri; judul yang sama dengan model tim PMO ditolak). Tetap tertutup (403) dan **tidak tampil di menu**: Monthly Executive Review, Master Schedule, Galeri, Document Control, Library, Pelaporan Manajemen, Input. Data dibatasi di server: Weekly dipaksa ke PROYEK_ID akun, Spotlight memakai data Executive yang sudah disaring `userCanAccess_` (ktrBlock_ di `getExecutiveDashboardData` dan `getSpotlightIntro` dibuang; halaman Executive tetap 403), Live View menyaring proyek & kamera. Menu yang disaring: header Portal v2 (`KTR_OK` di portal-v2.js, tombol Monthly Executive Review disembunyikan), sidebar (`HIDE` di gerbang AccountMenu), menu akun/ponsel, Ctrl K (nav-theme.js).
- **`pmoUser` di sessionStorage** (18 Nov): `clientShim(user)` di `routes/gas.js` kini mengisi `pmoUser` {username, name, role, project, projectId} di setiap halaman. Sebelumnya hanya Login Apps Script yang mengisinya, sehingga menu berbasis peran (Ctrl K, menu akun, gerbang kontraktor) di server baru selalu menganggap peran kosong.
- **Perbaikan Tambah Proyek / copyTo** (18 Nov): `Range.copyTo(..., PASTE_FORMAT)` di `src/gas/sheets.js` dulu menyalin **nilai**, bukan hanya format. Akibatnya blok proyek baru dari Tambah Proyek tertimpa isi baris contoh (DERMAGA_A) sehingga proyek baru tidak tersimpan dan muncul blok DERMAGA_A ganda di ekor DATA MINGGUAN PROYEK / DATA BULANAN; Input Progress mode BATCH juga menyalin nilai minggu sebelumnya ke sel kosong di kolom minggu baru. Sekarang PASTE_FORMAT = format saja, PASTE_VALUES = nilai, PASTE_NORMAL = nilai + format (pola sumber diulang bila tujuan lebih besar).
  - `src/gas/repair-dup-blocks.js` berjalan saat server start: menghapus blok ganda di ekor kedua sheet (hanya bila semua baris dari duplikat pertama s.d. akhir adalah duplikat). Log `gas_repair_dup_blocks`. Pembaca data memakai baris pertama, jadi angka dashboard tidak berubah.
  - Proyek baru tampil di Portal/Weekly/Executive setelah ada realisasi mingguan pertama (atau realisasi biaya > 0) — sama dengan Apps Script (`isProjectActive_`, `SHOW_EMPTY_PROJECTS=false`). Sebelum itu proyek ada di Tambah/Edit Proyek dan Input Progress.
- **Portal Proyek gaya "Vision 2030"** (18 Nov), acuan `docs/vision2030-portal-preview.html`. File `src/gas/portal-v2.js` (CSS + skrip di bawah `html.pv2`, hanya halaman Portal); didaftarkan paling akhir di loop patch `runtime.js`.
  - Elemen lama **tidak dibuang**, hanya ditata ulang: header jadi bilah melayang; hero (carousel `heroPhotos`, cadangan `/media/brand/login-bg.jpg?v=2`, `bg-1.jpg`, `bg-2.jpg`) jadi layar penuh; KPI hero pindah ke baris kartu di kanvas; Ringkasan (`pmoPortalBrief`, portal-latest.js) di atas grid; Story Lapangan di bawah grid.
  - Menu modul = dropdown di header (HP: tombol Menu → panel samping). Isinya **diambil dari tombol kartu Modul lama** (kartu disembunyikan, tidak dihapus), jadi hak akses per peran dan semua `go(...)` tetap sama. Menambah tombol di kartu Modul otomatis ikut muncul di dropdown.
  - Grid "PROYEK - PROYEK PENGEMBANGAN": kartu portrait bertingkat dari `i.lw` (week terakhir yang diinput), filter Semua / Pengembangan / Investasi Rutin / Selesai (aktual ≥ 100%). Klik kartu → `goWeek`. Kartu `#pulse` lama tetap dirender tapi disembunyikan.
  - Tab "TANYA SENA" di tepi kanan membuka widget Sena (`.aic-fab` disembunyikan secara visual, di-klik lewat skrip).
  - Tema: Terang/Gelap dan Biru/Sage/Mocha tetap dari menu akun (`data-theme`, `data-accent`); variabel warna `--v-*` mengikuti keduanya.
- **Visual 3D Proyek** (17 Nov), halaman `?page=visual3d`:
  - Letak menu: sidebar kelompok Dokumen & Lapangan (setelah Live View CCTV), menu HP, dan Ctrl K. Akun kontraktor melihatnya hanya untuk proyeknya sendiri (sejak 18 Nov, lihat *Kontraktor · akses halaman*).
  - Berkas: `src/gas/visual3d.html` (templat virtual "Visual3D"), `src/gas/visual3d.js` (rute Code.gs, patch sidebar, tombol Weekly), `src/routes/model3d.js` (API), migrasi `009-model3d.sql`.
  - Tim mengunggah **satu berkas .html mandiri** per model (mis. three.js), maks 15 MB, disimpan di Postgres (tabel `model3d`). Hanya versi terbaru: judul sama di proyek yang sama, atau pilihan "Ganti: …", menimpa berkas lama.
  - Yang boleh unggah, ganti, ubah judul, unduh asli, dan hapus: **Admin**, dan **PIC** untuk proyeknya sendiri serta sub-proyeknya (aturan sama dengan Arsip). Semua akun lain (kecuali kontraktor) hanya melihat.
  - Keamanan: `/model3d/:id/view` selalu disajikan dengan header `Content-Security-Policy: sandbox allow-scripts …` (tanpa allow-same-origin), dan iframe juga diberi `sandbox`. Skrip model tidak bisa membaca cookie sesi, memanggil API, atau menyentuh halaman induk (sudah diuji). Skrip hanya dari cdnjs, jsdelivr, unpkg; font dari Google Fonts.
  - Tema terang/gelap dashboard diteruskan ke model (`?theme=` dan postMessage `pmoTheme`).
  - Weekly Progress: tombol **Lihat model 3D** muncul di kartu judul bila proyek itu punya model.
  - Presentasi: tombol **Tambah 3D** di layar Siapkan presentasi (Executive & Weekly). Jenis item `{type:'model3d', model, pos}` di `pres_sets`. Model dimuat hanya saat slidenya tampil.

### Riwayat perubahan (log) · mulai 18 Nov 2026

Aturan: **setiap pembaruan dicatat di sini**, baik yang dikerjakan pemilik lewat Antigravity maupun oleh Claude. Satu baris per commit/kelompok commit, terbaru di bawah. Rinciannya (bila perlu) ditulis di bagian fitur masing-masing di atas.

| Tanggal | Oleh | Commit | Perubahan |
|---|---|---|---|
| 18 Nov | Claude | `a19bbbd` | Kontraktor: buka Weekly, Live View, Spotlight, Visual 3D untuk proyeknya sendiri; menu tanpa halaman yang tidak berhak (`ktr-access.js`, `pmoUser` di `clientShim`). |
| 18 Nov | Antigravity | `09b920d` `ec3a080` `2085a17` `104e962` | Resume Weekly menjadi tabel 4 Bidang × 4 Disiplin, dibaca dari kolom DISIPLIN baseline; pemetaan khusus Dermaga A, Conveyor, Fosfat; perbaikan bentrok `type` vs `epcType`. |
| 18 Nov | Antigravity | `3c5fe32` `d9e8ade` | Buat Laporan Bulanan: tabel kontribusi per disiplin (bobot & kontribusi, tanpa kolom kendala/action); susunan scope pekerjaan. |
| 18 Nov | Antigravity | `53ef651` `149dd18` `ffc924a` | Spotlight Lobby tampilan baru (`src/gas/spotlight-v2.js`, acuan `docs/spotlight-adobe-preview.html`), transisi 2,5 detik. |
| 19 Nov | Antigravity | `f7a4f4b` `406eb79` `2af7b48` `19ac1d5` `bd5fb6f` `2b032eb` | Portal: Ringkasan Konsep B (badge inline), scroll rail + section dots + "↑ Ke atas", Daftar Proyek gaya showcase Vision 2030, klik logo Petrokimia/PMO kembali ke Portal, halaman penuh, perbaikan versi HP. Acuan `docs/portal-*-preview.html`. |
| 19 Nov | Antigravity | `19ca9c5` | Bug hapus foto galeri (`legacy/Gallery.html`). |
| 19 Nov | Antigravity | `be61d80` `baaedbb` | Library & Knowledge tampilan modern (`src/gas/library-v2.js`, `src/routes/library.js`), parser lebih akurat, unggah ke Drive Library. |
| 19 Nov | Antigravity | `77cf392` | Tampilan halaman admin (`views/layout.ejs`, `views/pages/admin-*.ejs`, `arsip.ejs`). |
| 20 Nov | Antigravity | `c1d797e` | Pratinjau dokumen Drive dengan tombol muat ulang (`src/gas/drive-preview.js`, `src/routes/drive-preview.js`). |
| 20 Nov | Antigravity | `59eef0c` `d340339` `affa72f` `54f67a2` `5f2942e` `6d0d6e6` `c2a3f32` `86bf2fd` `d336d26` | Monthly Executive Review: tata letak baru, header menyatu dengan banner, kartu isi halaman frosted glass (breadcrumb dihapus), menu isi halaman dinamis, header sticky, perbaikan race condition galeri story; presentasi tampilan gelap (`src/gas/exec-story-brief.js`). |
| 20 Nov | Antigravity | `9855295` | Menu melayang sidebar diperiksa di semua halaman (`nav-theme.js`). |
| 20 Nov | Antigravity | `1804fb0` | Presentasi: Input/PIC bisa menambah PDF; migrasi `010-pres-project-scope.sql`. |
| 20 Nov | Antigravity | `dbe7018` | Kelola Akun `/admin/akun` + pelacakan aktivitas online; migrasi `011-user-last-seen.sql`, `src/session.js`. |
| 20 Nov | Antigravity | `6d43bc4` | Perbaikan `live-lan.js` (CCTV jaringan internal). |
| 21 Nov | Antigravity | `65df265` `2ba1967` `a727403` `ad94d0a` `cda61bf` `100f3d4` `ec81a2c` | Weekly Progress: Unified Hero Banner (`src/gas/weekly-hero.js`), scroll HUD, dropdown proyek dengan hover, perbaikan daftar proyek. |
| 21 Nov | Antigravity | `c1c9a3d` `61e7a6e` `a1a195f` `13dc20f` `167acff` | Master Schedule: header Alternatif B (`src/gas/master-hero.js`), banner otomatis dari foto banner tiap proyek, progres tingkat proyek (`legacy/Code.gs`, `legacy/MasterSchedule.html`, `Gallery.html`). |
| 21 Nov | Antigravity | `bae9480` `d7f067a` | Pembaruan `nav-theme.js` dan `portal-v2.js`. |
| 21 Nov | Pemilik | – | Halaman "sudah pindah" di Apps Script disesuaikan pemilik (di proyek Apps Script, bukan repo ini). Logo login disesuaikan pemilik; pertahankan. |
| 22 Nov | Claude | `4ce7e08` | Uji asap versi `d7f067a`: semua halaman admin & kontraktor terbuka tanpa error JS, tidak ada `gas_patch_miss`. Catatan tab Pengiriman (EPCC › Procurement) kini menyebut ADMIN, tim proyek, atau kontraktor bidang Procurement sebagai pengunggah dokumen FOB (patch di `ktr-docs.js`). CSP (`src/routes/csp.js`): `'wasm-unsafe-eval'` di script-src; `data:` + OneDrive di media-src; `cdn.jsdelivr.net`, `cdnjs`, `api-badgerp.svc.ms`, `*.microsoftpersonalcontent.com`, `*.1drv.com` di connect-src; OneDrive di img-src. Riwayat ini dimulai. |
| 22 Nov | Claude | `75f9d49` | **Slide proyek + Prognosa akhir tahun** (`src/gas/pres-proj.js`, baru). Di layar Siapkan presentasi (Monthly Executive Review & Weekly) ada tombol **Tambah slide proyek**: pilih proyek + jenis slide *Ringkasan minggu terakhir*, *Realisasi keuangan cut-off bulanan* (tabel & catatan seperti Laporan Bulanan Bab 6), *3 Month Look Ahead*, *Prognosa akhir tahun*. Admin: semua proyek; PIC/Input: proyek & sub-proyeknya (dicek di `routes/pres.js`, item `{type:'proj', project, kind}`). Data diambil saat slide tampil lewat RPC `getPresProjSlide` (selalu minggu / bulan cut-off terakhir). Weekly: card **Prognosa akhir tahun** di bawah Realisasi keuangan (`prognosis` di data Weekly, fungsi `presPrognosis_`), plus slide bawaan *Prognosa akhir tahun*, *Realisasi keuangan (cut-off bulanan)*, *3 Month Look Ahead* yang bisa disembunyikan. Rumus prognosa: biaya = realisasi tahun berjalan s.d. cut-off + RKAP bulanan bulan berikutnya s.d. Desember (cadangan: sisa RKAP tahunan); fisik = aktual minggu terakhir + kenaikan rencana s.d. 31 Desember (deviasi tetap), maks 100%. Kelas CSS memakai awalan `pjx-` (awalan `.pj` sudah dipakai halaman lama). |
| 22 Nov | Claude | `3574063` | Revisi atas masukan pemilik (`src/gas/pres-proj.js`): (1) Prognosa **fisik** tidak lagi diforecast; card menampilkan target rencana baseline s.d. 31 Desember vs aktual minggu terakhir, sisa yang harus dicapai, sisa minggu, **kenaikan yang dibutuhkan per minggu**, pembanding kenaikan rencana baseline & rata-rata aktual 4 minggu terakhir, plus tabel **pekerjaan berbobot besar** yang menunjang kenaikan s.d. akhir tahun (dari 3 Month Look Ahead, bulan di tahun berjalan, urut kontribusi, maks 6; fungsi `presProgItems_`). Prognosa biaya tetap. (2) Slide Ringkasan eksekutif: tautan "Pencapaian Progress Proyek" / "Realisasi Keuangan Proyek" diganti teks *slide “judul slide”*; tombol Salin narasi/Dengarkan tidak ikut di slide. (3) Slide Realisasi keuangan proyek: hanya tabel per proyek (kartu pencapaian dihapus dari slide) + catatan narasi gaya Laporan Bulanan per kelompok (Pengembangan / Investasi Rutin) dan per proyek. |
| 22 Nov | Claude | `288133f` | **Isu manajemen** di mode presentasi Monthly & Weekly (satu sumber). Tabel baru `pres_issues` (migrasi `db/migrations/012-pres-issues.sql`), API `GET/POST /api/pres/issues`, `POST /api/pres/issues/:id/delete` di `routes/pres.js`. Isian: proyek, kategori (Biaya/Jadwal/Teknis/Perizinan/Kontrak/K3/SDM/Lainnya), judul, uraian & dampak, dukungan yang diminta, tingkat (Tinggi/Sedang/Rendah), status (Baru/Proses/Selesai), PIC tindak lanjut, target. Admin semua proyek; PIC/Input proyek & sub-proyeknya; akun lain hanya melihat; kontraktor tidak. Isu terbuka terbawa terus; isu Selesai tampil 7 hari (Weekly) / 31 hari (Monthly) setelah ditutup. Tombol **Isu manajemen** di layar Siapkan presentasi membuka panel kelola. Slide **Isu manajemen** (3 isu per slide, lanjutan "(2/n)"): Monthly setelah Ringkasan eksekutif (semua proyek, Pengembangan dulu lalu Rutin), Weekly setelah Mitigasi risiko (proyek itu + sub-proyek). Urutan: tingkat → butuh keputusan → proyek. Kode klien di `src/gas/pres-proj.js` (`issueSlides`, `manageIssues`, `prefetch`). |
| 22 Nov | Claude | `020a8a9` | Weekly: **Prognosa akhir tahun** dipindah menjadi bagian tersendiri lebar penuh `#sec-prog` / `#progPanel` (di bawah Progres & Kurva S, tidak lagi menempel di panel Progres per bidang sehingga sejajar dengan Kurva S). Ditambahkan ke menu Isi halaman (sidebar & `nav-theme.js`, batas daftar dinaikkan ke 8), tab HP *Ringkasan*, dan slide presentasi memakai panel ini. Tampilan HP: tabel pekerjaan berbobot besar berubah menjadi kartu per pekerjaan (`data-l`), tidak ada geser horizontal. |
| 22 Nov | Claude | `1332a51` | Card/slide **Prognosa akhir tahun** diganti nama **Target akhir tahun**. Kotak Biaya kini berbasis target RKAP tahun berjalan saja: angka besar = RKAP, bar realisasi (penanda = rencana RKAP s.d. cut-off), baris *Realisasi s.d. cut-off* (Rp & % RKAP), *Rencana RKAP s.d. cut-off* (bila RKAP bulanan diisi, dengan % serapan), *Sisa yang harus diserap* (atau "Sudah tercapai"). Prognosa, posisi vs nilai investasi, kebutuhan per bulan, dan rata-rata realisasi tidak ditampilkan (keputusan pemilik). Id/kunci teknis tetap (`#sec-prog`, kind `prog`, `presPrognosis_`); judul slide Weekly kini "Target akhir tahun". |
| 22 Nov | Claude | `1a48e46` | Target akhir tahun · tabel **Pekerjaan berbobot besar** kini selalu dari **baseline EPCC Control** (item baseline + grup WBS), seragam untuk semua proyek; proyek dengan Jadwal XML memakai hasil EPCC (`pr.alt` dari 3 Month Look Ahead). Bila proyek belum punya baseline EPCC tampil "Baseline EPCC Control proyek ini belum tersedia". 3 Month Look Ahead di Monthly tetap mengikuti sumber yang diatur di Master Schedule. Daftar tetap dari pilihan Look Ahead (maks 6), tidak dihitung ulang dari semua item (keputusan pemilik). |
| 22 Nov | Claude | `bef3754` | Weekly · tata letak baru (opsi A): Ringkasan → **Profil proyek horizontal** (`#sec-profil.prof-h`, 6 kotak; Tujuan dipotong 3 baris + tooltip; nilai investasi/kontrak diringkas Rp x,xx M dengan tooltip angka penuh) → Progres & Kurva S → **Highlight aktivitas lebar penuh 2 kolom** (`#sec-hl`, jumlah kegiatan di header) → Target akhir tahun → Concern & Mitigasi. Blok `sec-profil` lama dipecah saat runtime dimuat (`pres-proj.js`, dibaca dari `legacy/Dashboard.html`). Sidebar Isi halaman & menu ISI HALAMAN (`nav-theme.js`, batas 10) diperbarui; HP: Profil di tab Ringkasan, Highlight di tab Isu, 1 kolom. Slide Highlight 2 kolom. CSS di blok style `pres-proj.js` (patch `</style></head><body>` Dashboard tidak bisa dipakai lagi karena modul lain sudah mengubahnya). |
| 22 Nov | Claude | `5319e6c` | **Nilai kontrak campuran mata uang** (IDR + USD + CNY + CNH). Migrasi `013-contract-fx.sql` (tabel `fx_rates` per bulan, `contract_fx` riwayat komponen BASE/ADD). `src/lib/fx.js`: kurs otomatis dari api.frankfurter.dev (urutan: penyedia Bank Indonesia → kurs gabungan → v1/ECB; CNH memakai CNY bila tidak tersedia), bulan berjalan diperbarui tiap 6 jam, 24 bulan terakhir dilengkapi; data di memori + bridge `fx` ke kode lama. API `src/routes/fx.js`: `GET /api/fx/rates`, `POST /api/fx/refresh` (Admin), `GET/POST /api/contract-fx` (Admin; PIC/Input proyek & sub). `src/gas/contract-fx.js`: `contractIdr_(db,pid,'YYYY-MM')` menggantikan pembacaan `NILAI_KONTRAK` (Weekly = kurs terbaru; tabel keuangan Monthly & Laporan Bulanan = kurs bulan cut-off; termin, lifecycle/addendum = kurs terbaru); proyek tanpa valas tetap memakai nilai Rupiah di DATA BULANAN. Tambah/Edit Proyek & Addendum: isian per mata uang, nilai kontrak Rupiah dihitung otomatis (tetap disimpan ke `NILAI_KONTRAK` pada kurs saat simpan). Weekly profil: rincian "USD … + CNY … + Rp … · kurs …". Perubahan komponen/kurs memanggil `dataChanged_` agar cache hitungan diperbarui. |
| 22 Nov | Claude | `e903a6e` | **Nilai FS & realisasi biaya per mata uang + pos Biaya lain.** Migrasi `014-cost-fx.sql` (tabel `fs_fx` satu baris per proyek: kurs FS tetap + komponen Plant/IDC/PM/Biaya lain; `cost_fx` realisasi per proyek-bulan-pos dengan kurs yang dipakai). `src/lib/fx.js` (+`rateOn` kurs per tanggal, `saveFs`, `saveCost`), `src/routes/fx.js` (+`GET /api/fx/rate-on`, `GET/POST /api/fs-fx`, `POST /api/cost-fx`; Admin atau Input sesuai lingkup, kontraktor ditolak). Modul baru `src/gas/cost-fx.js`: (1) Tambah/Edit Proyek blok **Nilai FS per mata uang** (Rp/USD/CNY/CNH × Plant/IDC/PM + 1 baris Biaya lain bernama bebas; tanggal kurs FS → kurs BI otomatis, boleh manual; baris yang diisi mengunci & menghitung Plant/IDC/PM FS; info nilai FS pada kurs terbaru; disembunyikan untuk proyek Rutin/Sub). (2) Laporan Bulanan blok **Realisasi per mata uang** (kolom = Rp + valas yang dipakai kontrak/FS; kurs BI bulan itu, boleh disesuaikan; baris Biaya lain bila ada di FS). Nilai Rupiah Plant/IDC/PM tetap ditulis ke DATA BULANAN; Biaya lain hanya di `cost_fx`/`fs_fx`. (3) `cellNumber_` dibungkus (`cellNumberRaw_` = pembaca asli): NILAI_INVESTASI_FS, TOTAL_INVESTASI_AKTUAL, INVESTASI_AKTUAL_KOMULATIF_MONTHLY ditambah Biaya lain; baris virtual OTHER_COST_FS/OTHER_COST_ACTUAL. Tabel keuangan (`mrFinanceAt_`: Executive, slide, Laporan Bulanan Word) dapat baris Biaya lain; kartu Realisasi Keuangan Weekly ikut; profil Weekly menampilkan rincian investasi valas + tanggal kurs FS. Realisasi sebelum periode dashboard tetap Rupiah. |
| 22 Nov | Claude | `9a9ca88` | **Ganti nama menu:** *Input Progress* → **Input Progress Mingguan**, *Laporan Bulanan* → **Input Progress Bulanan** (sidebar semua halaman, menu Portal, menu ponsel, Ctrl K, judul halaman/tab, AI widget, notifikasi "Input progress bulanan … belum diisi", teks penunjuk "di Laporan Bulanan"). Dikerjakan sebagai penggantian teks global di `src/gas/runtime.js` (`MENU_RENAMES`) + `src/gas/nav-theme.js` (Ctrl K, kata kunci lama tetap bisa dicari). *Buat Laporan Bulanan (dokumen)* tidak berubah; alamat `?page=input` / `?page=monthly` tetap. **Tema gelap** untuk blok Nilai kontrak/FS per mata uang (Tambah/Edit Proyek) dan Realisasi per mata uang (Input Progress Bulanan) di `src/gas/cost-fx.js`. |
| 22 Nov | Claude | `9a9ca88` | **Document Control · MoM, Surat masuk, Surat keluar.** Kategori baru di register (tahap Pelaksanaan): `MOM` (MoM / risalah rapat, jenis Internal/Eksternal), `SURAT_MASUK`, `SURAT_KELUAR`; Perihal = judul, Pihak = pengirim / kepada / pimpinan rapat. Isian khusus (kepada, penandatangan + jabatan, tembusan, tanggal diterima, waktu, tempat, peserta, notulis) di tabel baru `doc_meta`; **tindak lanjut MoM opsional** di `doc_actions` (uraian, PIC, pihak PKG/Kontraktor/Lain, batas waktu, status, catatan, link bukti) — migrasi `015-doc-meta.sql`, rute `src/routes/docmeta.js` (`GET/POST /api/doc-meta`, `POST /api/doc-actions/:id`). Tab/menu **Tindak lanjut MoM** (rekap, lewat batas merah, filter status/pihak). **Baca otomatis tanpa AI**: pdf.js membaca teks PDF di browser; PDF scan/gambar dibaca **OCR Tesseract** (tesseract.js + data `ind`/`eng` disajikan dari server: `/vendor/tesseract`, `/vendor/tesseract-core`, `/vendor/tessdata`; dependensi baru di `package.json`). Pola baca di `src/gas/doc-parse.js` (nomor, tanggal, perihal, kepada, dari/kop, penandatangan, tembusan, tempat, waktu, pimpinan, peserta, notulis), diuji dengan contoh surat & risalah asli; hasil mengisi kotak sebagai usulan (kuning) — wajib dicek. Bisa dipicu saat memilih berkas atau tombol *Baca otomatis* (juga untuk berkas Drive yang sudah terdaftar, lewat `/api/drive/preview-pdf`). **Kontraktor**: boleh membuka Document Control (`KONTRAKTOR_PAGES` + `ktr-access.js` + Ctrl K), hanya melihat MoM proyeknya dan memperbarui status/catatan/bukti butir berpihak *Kontraktor*; register lain, pratinjau dokumen lain, paket arsip ditolak di server (patch `DocApi` di `src/gas/doc-mom.js`). Impor folder: nama berkas *risalah/notulen/MoM*, *surat masuk*, *surat keluar* ditebak ke kategori baru. |
| 23 Nov | Claude | `c61e14c` | **Document Control · Asuransi.** Kategori baru `ASURANSI` (tahap Awal proyek) dengan jenis CAR, EAR, TPL, marine cargo, alat berat, BPJS Ketenagakerjaan, lainnya; memakai kolom register yang sama dengan Jaminan (nomor polis, mulai berlaku = TANGGAL, berakhir polis = BERLAKU_SAMPAI wajib, nilai pertanggungan = NILAI, perusahaan asuransi = BANK, tertanggung = PIHAK) dengan status sendiri `INS_STATUS` AKTIF / DIPERPANJANG / BERAKHIR / KLAIM. Tab & menu samping **Asuransi** (ringkasan polis aktif, ≤ 30 hari, lewat, berakhir; tabel polis), kartu KPI *Jaminan aktif* ikut menampilkan ringkasan asuransi, register menampilkan nilai · asuransi · s.d. tanggal + penanda jatuh tempo. Kelengkapan: *Polis asuransi proyek* (tidak wajib). Impor folder: nama berkas asuransi/polis/CAR/EAR/TPL/BPJS ditebak ke Asuransi (setelah aturan jaminan, sehingga surety bond tetap Jaminan). Asisten AI: kategori ASURANSI/MOM/SURAT_MASUK/SURAT_KELUAR bisa disaring, sisa hari polis dihitung. Modul `src/gas/doc-ins.js`. |
| 24 Nov | Antigravity | – | **Document Control · Unified Hero Banner & UI Polish** (`src/gas/doc-hero.js`, `public/media/doc-control-banner.jpg`, `src/gas/nav-theme.js`, `src/gas/runtime.js`). Menyamakan tampilan dengan Weekly / Monthly / Master Schedule memakai 1 banner khusus bertema Document Control yang konsisten di semua proyek (mendukung Biru, Sage, Mocha, Gelap), pemilih proyek Modern HUD, tautan Folder Drive Tim di topbar banner, dropdown frosted-glass *Isi halaman* (termasuk filter mode Kontraktor), sticky scroll bar `#exStuckHost`, kartu KPI interaktif, dan penyempurnaan panel/tabel register dokumen. |
| 24 Nov | Antigravity | – | **Library & Knowledge · Unified Hero Banner & Reader Polish** (`src/gas/library-hero.js`, `public/media/library-banner.jpg`, `src/gas/library-v2.js`, `src/gas/nav-theme.js`, `src/gas/runtime.js`). Mengganti dua bar atas lama dengan 1 Hero Banner ringkas lintas proyek bertema Library & Knowledge (Biru, Sage, Mocha, Gelap) berisi pill cakupan Semua Proyek, tombol CTA `+ Unggah dokumen`, badge status indeks/OCR, dan dropdown frosted-glass *Isi halaman*. Mode `Fokus` ikut menciutkan hero menjadi strip tipis untuk memaksimalkan ruang baca PDF; toolbar navigasi PDF otomatis tersembunyi di mode `Ringkasan`; ringkasan dilengkapi 4 kartu metrik halaman, legenda dot warna `Peta Keterbacaan` yang bisa diklik per halaman, dan perapian kartu daftar dokumen. |
| 24 Nov | Antigravity | – | **Visual 3D Proyek & Live View (CCTV) · Unified Hero Banner & Workspace Polish** (`src/gas/visual3d-hero.js`, `src/gas/liveview-hero.js`, `public/media/visual3d-banner.jpg`, `public/media/liveview-banner.jpg`, `src/gas/runtime.js`, `src/gas/visual3d.html`, `src/routes/model3d.js`). Menyamakan kedua halaman dengan tema Unified Hero Banner (Biru, Sage, Mocha, Gelap): masing-masing memakai 1 banner khusus, pemilih proyek Modern HUD di dalam banner (menggantikan baris pill lama di atas kanvas/video), tombol CTA putih `+ Unggah model` / `Kelola kamera`, shortcut `Layar penuh`, sticky scroll host `#exStuckHost`, kartu stage & metadata yang lebih rapi, kartu panduan NVR jaringan internal LAN yang lebih jelas pada Live View, serta penyelarasan tema aksen & mode gelap ke dalam iframe Visual 3D (`THEME_JS`). |
| 24 Nov | Antigravity | – | **EPCC Control (4 Bidang) · Unified Hero Banner Tematik** (`src/gas/epcc-hero.js`, `public/media/epcc-eng-banner.jpg`, `public/media/epcc-proc-banner.jpg`, `public/media/epcc-cons-banner.jpg`, `public/media/epcc-com-banner.jpg`, `src/gas/runtime.js`). Menerapkan Unified Hero Banner foto resolusi tinggi di `Engineering.html` dan `Epcc.html` sesuai tema masing-masing bidang (`Engineering` stasiun kerja CAD 3D & cetak biru, `Procurement` dermaga logistik & gantry crane kapal kargo, `Construction` struktur baja malam & tangki proses kilang, `Commissioning` galeri observasi & manifold uji), Pemilih Proyek Modern HUD, switcher 4 bidang di Row 1 HUD yang tetap sejajar 1 baris, dropdown frosted-glass *Isi halaman* dinamis, sticky bar `#exStuckHost`, serta sinkronisasi warna batang progres (`--c2`, `--s1`) pada 4 tema dashboard (Biru, Sage, Mocha, Gelap). |
| 24 Nov | Antigravity | – | **Input Progress Mingguan, Input Progress Bulanan & Tambah / Edit Proyek · Unified Hero Banner Tematik** (`src/gas/input-hero.js`, `public/media/input-weekly-banner.jpg`, `public/media/input-monthly-banner.jpg`, `public/media/project-setup-banner.jpg`, `src/gas/nav-theme.js`, `src/gas/runtime.js`). Melebur topbar putih, strip `#pmoPbar`, dan hero gradien menjadi 1 Unified Hero Banner tematik per halaman, memindahkan Pemilih Proyek Modern HUD + pengontrol kontekstual (Week / Bulan / Mode Proyek) sejajar 1 baris dengan Cari/Bell/Akun di Row 1, mengganti bar `.steps` menjadi dropdown frosted-glass *Isi form* + sticky bar `#exStuckHost`, mengecualikan `.ex-hero-hdr` dari aturan gradien lama di `nav-theme.js` agar banner tampil utuh di tema Sage & Mocha, serta menyinkronkan warna tombol hover, focus ring, readonly input, kartu, dan batang progres di 4 tema (Biru, Sage, Mocha, Gelap). |
| 24 Nov | Claude | `cadff60` | **Sena v2.** Jalur async job + polling, routing Haiku 5.5 (cepat) / Sonnet 5.5 (analisis & bahan rapat), effort & max_tokens per mode, fallback jawaban kosong, mode "Bahan rapat" (`paket_rapat`), indeks teks dokumen + OCR (`cari_dokumen`), tombol "Jadikan isu manajemen", batas 5 pertanyaan/hari dan anggaran 10 USD/bulan (`ai_usage`). Berkas: `db/migrations/016-sena.sql`, `src/lib/sena.js`, `src/lib/doctext.js`, `src/routes/sena.js`, `src/gas/sena-v2.js`, `src/gas/sena-extra.js`, `src/gas/runtime.js`, `src/server.js`. |
| 25 Nov | Claude | `46cebbc` | **Tambah/Edit Proyek · tombol "Cek link" Folder Drive tim proyek** (`src/gas/project-drive.js`, dipasang di `runtime.js`). Fungsi server `checkProjectDrive(token, projectId, url)` memeriksa tanpa menyimpan: harus link folder (bukan file/dokumen), folder bisa dibuka akun web app, akun web app bisa menulis (file uji dibuat lalu dibuang), dan peringatan bila folder sudah dipakai proyek lain. Otomatis dicek saat isian berubah; daftar kelengkapan merah bila link baru belum dicek atau gagal, sehingga belum bisa disimpan. |
| 25 Nov | Claude | `46cebbc` | **Input Progress Mingguan · unggah video/materi + input kontraktor.** Unggah langsung ke Drive akun tim proyek (video 2 GB, materi 200 MB, resumable 16 MB, jeda/lanjut), file lama dipindah ke sampah saat disimpan; kontraktor mengisi HSE + video/materi dan mengirim ke PIC/Admin (`ktr_weekly`). Berkas: `db/migrations/017-weekly-upload.sql`, `src/lib/weekly-upload.js`, `src/routes/weekly-upload.js`, `src/gas/weekly-upload.js`, `src/arsip/service.js`, `src/gas/ktr-access.js`, `src/gas/nav-theme.js`, `src/gas/runtime.js`, `src/routes/gas.js`, `src/server.js`. |
| 25 Nov | Claude | `db9d4d1` | **Akun USER / VIEWER tanpa EPCC Control** (`src/gas/viewer-access.js`). Menu EPCC disembunyikan (menu atas Portal, tile Modul 3, menu samping grup M3, Ctrl K, menu ponsel); halaman engineering/epcc/procurement/construction/commissioning ditolak server dan fungsi data EPCC (`getEpccData`, `getEpccWeekPack`, `readEpcFobDoc`, `getEngineeringData`, `getEngArchive`, `getEngFileBytes`) ditolak di `/app/rpc` untuk akun role `viewer`. ADMIN, PIC/INPUT, dan KONTRAKTOR tetap seperti sebelumnya. Berkas: `src/gas/viewer-access.js`, `src/gas/runtime.js`, `src/gas/nav-theme.js`, `src/routes/gas.js`. |
| 26 Nov | Claude | `150bf4b` | **Sena: progres dari week terbaru, keuangan dari bulanan terakhir + perbaikan tautan.** Alat `daftar_proyek` & `ringkasan_proyek` dibungkus di `src/gas/sena-v2.js`: aktual/rencana/deviasi/SPI/status/isu dari input mingguan terbaru tiap proyek (`weekProgres`), CPI & termin dari cut-off bulanan terakhir (`keuanganBulanan`); jumlah On track/At risk/Critical dihitung ulang dari data mingguan. Aturan 16 di `PROMPT_V2` (`src/lib/sena.js`). Perbaikan: `var senaBegin_ = null, senaFinish_ = null, …` dalam satu baris membuat runtime hanya mengekspor nama pertama, sehingga tautan `[[…]]` tampil mentah; kini satu deklarasi per baris. Tautan proyek (`WEEKLY`) tidak lagi ditolak bila kodenya diisi ID proyek (`src/gas/sena-extra.js`). |
| 27 Nov | Antigravity | `cf49402` | Portal: teks "· Input terakhir …" dihapus dari baris atas hero (`#heroEye` kini hanya "PMO Infrastruktur & Process Plant") (`src/gas/portal-v2.js`). |
| 28 Nov | Antigravity | `843d4af` | Input Progress Mingguan/Bulanan · pemeriksaan visual tema terang (`src/gas/input-hero.js`): tombol header di atas banner diberi latar gelap transparan agar terbaca di tema terang; warna legenda/garis kurva mengikuti warna tema; menu "Isi halaman" kini menandai bagian yang sedang dilihat dan menyembunyikan bagian yang tidak tampil (untuk kontraktor: Progres & Concern disembunyikan). |
| 28 Nov | Antigravity | `e008b6f` | **Navigasi kontraktor di Portal** (`src/gas/portal-v2.js`, `src/gas/nav-theme.js`, `src/gas/input-hero.js`): menu Portal kontraktor ditambah *MoM / Risalah Rapat* (grup Dokumen & 3D) dan grup *Input Mingguan → Input HSE & Video Mingguan*, serta tombol pintas ke Input di bar atas Portal. Dialog Simpan/Kirim di halaman Input dibuat membungkus teks/link panjang tanpa scroll horizontal; tombol "Ke atas", section dots dan tombol Sena digeser di atas action bar dan disembunyikan saat dialog terbuka. Ikut ter-commit: 2 berkas `Laporan Weekly Kontraktor/*Week 49*CONVEYOR*.xlsx` (±24 MB). |
| 28 Nov | Antigravity | `fa9e46a` | Card **Target akhir tahun** (`src/gas/pres-proj.js`): kontraktor kini bisa memuat card ini untuk proyeknya sendiri (hanya jenis `prog`, jenis slide lain tetap diblokir); pencarian proyek cocok lewat ID atau nama; hasil pekerjaan berbobot besar untuk kontraktor di-cache; card memuat datanya sendiri bila dibuka tanpa data awal ("Memuat target akhir tahun…"). |
| 28 Nov | Antigravity | `d02fd8b` | **Stabilitas server ("Bad Sector" / 502)** — `src/server.js`: `keepAliveTimeout` 65 dtk & `headersTimeout` 66 dtk (cegah 502 dari idle keep-alive di belakang proxy Traefik), `requestTimeout` 5 menit, cek `/health` database dibatasi 3 dtk, shutdown rapi. `Dockerfile`: healthcheck tiap 15 dtk, timeout 8 dtk, start period 45 dtk. Panggilan Google Drive diberi batas waktu (`src/gas/sync.js`, `src/google/sync-http.js` — worker macet dihentikan, `src/routes/drive-preview.js`, `src/routes/admin.js`). Indeks dokumen Sena (`src/lib/doctext.js`): 1 dokumen per putaran (sebelumnya 3), batas ukuran default 20 MB (env `SENA_DOC_MAX_MB`, 5–45), OCR dilewati bila `@napi-rs/canvas` tak tersedia, jeda tiap 10 halaman agar `/health` tetap dilayani. Juga `src/routes/gas.js`, `src/routes/model3d.js`. |
| 28 Nov | Antigravity | `c012699` `3fe3f15` | **Aturan rilis periode Monthly Executive Review & 3 Month Look Ahead** (`src/gas/exec-period.js` baru, dipasang di `runtime.js`): laporan bulan *m* tampil otomatis mulai **tanggal 7 bulan berikutnya** (mis. November 2026 mulai 7 Des 2026), atau lebih cepat bila semua proyek wajib lapor sudah melengkapi Input Progress Bulanan. Portal tetap memakai aturan lama. Keterangan kelengkapan (`#periodNote`) diringkas 1 baris + tombol "Lihat rincian". `3fe3f15`: perbaikan patch agar tetap terpasang (berkas legacy dibaca dengan akhir baris LF). |
| 28 Nov | Antigravity | `3a01509` | **Admin Center · Hero Portal** (`/admin/hero-portal`; `src/routes/hero-portal.js`, `views/pages/admin-hero-portal.ejs`, menu di `views/layout.ejs`, `src/gas/portal-hero-admin.js`, `src/server.js`): Admin bisa mengunggah, memberi caption/ganti nama, mengurutkan (`PORTAL_HERO_ORDER`), menghapus (ke Trash Drive) foto hero Portal, mengganti folder Drive (`PORTAL_HERO_FOLDER`), dan membersihkan cache. Foto hero kini disajikan lewat `/media/hero/:id` dengan cache memori + disk server, sehingga Portal lebih cepat. |
| 28 Nov | Claude | – | HANDOVER: riwayat perubahan 27–28 Nov dilengkapi; hash commit baris Sena 26 Nov diisi (`150bf4b`). |

**Ditunda (disimpan dulu atas keputusan pemilik, 22 Nov):** label Rev-n, CCTV opsi B, Dashboard HSE, halaman pengenalan untuk kontraktor.
**Masih terbuka:** penegakan CSP (`CSP_MODE=enforce` di Coolify) setelah /admin/csp sepi beberapa hari; nilai Fosfat "Rp 0,0 M".

---

## 7. Preferensi kerja pemilik
- Balas dalam **Bahasa Indonesia**. Jangan memanggil "Bapak".
- Pemilik **awam pemrograman**. Beri langkah klik demi klik (GitHub Desktop, Coolify), singkat dan jelas.
- **Tunjukkan konsep dulu** sebelum perubahan besar, lalu kerjakan bertahap. Sertakan screenshot atau pratinjau bila memungkinkan.
- Setelah perubahan selalu sebutkan:
  - file apa yang berubah;
  - Summary commit yang disarankan;
  - langkah **Commit → Push origin → Redeploy**;
  - apa yang perlu dicek di browser.
- Setiap pembaruan (termasuk yang dikerjakan pemilik lewat Antigravity) **dicatat di tabel Riwayat perubahan** di akhir bagian 6.
- Tampilan harus tetap **sama dengan versi Apps Script** kecuali diminta berbeda.
