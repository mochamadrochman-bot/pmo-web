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
- **Belum dikerjakan:** penegakan CSP setelah beberapa hari pemantauan; logo Petrokimia pada gambar latar login yang terpotong di lebar ±1000px.
- **Portal Proyek gaya "Vision 2030"** (18 Nov), acuan `docs/vision2030-portal-preview.html`. File `src/gas/portal-v2.js` (CSS + skrip di bawah `html.pv2`, hanya halaman Portal); didaftarkan paling akhir di loop patch `runtime.js`.
  - Elemen lama **tidak dibuang**, hanya ditata ulang: header jadi bilah melayang; hero (carousel `heroPhotos`, cadangan `/media/brand/login-bg.jpg?v=2`, `bg-1.jpg`, `bg-2.jpg`) jadi layar penuh; KPI hero pindah ke baris kartu di kanvas; Ringkasan (`pmoPortalBrief`, portal-latest.js) di atas grid; Story Lapangan di bawah grid.
  - Menu modul = dropdown di header (HP: tombol Menu → panel samping). Isinya **diambil dari tombol kartu Modul lama** (kartu disembunyikan, tidak dihapus), jadi hak akses per peran dan semua `go(...)` tetap sama. Menambah tombol di kartu Modul otomatis ikut muncul di dropdown.
  - Grid "PROYEK - PROYEK PENGEMBANGAN": kartu portrait bertingkat dari `i.lw` (week terakhir yang diinput), filter Semua / Pengembangan / Investasi Rutin / Selesai (aktual ≥ 100%). Klik kartu → `goWeek`. Kartu `#pulse` lama tetap dirender tapi disembunyikan.
  - Tab "TANYA SENA" di tepi kanan membuka widget Sena (`.aic-fab` disembunyikan secara visual, di-klik lewat skrip).
  - Tema: Terang/Gelap dan Biru/Sage/Mocha tetap dari menu akun (`data-theme`, `data-accent`); variabel warna `--v-*` mengikuti keduanya.
- **Visual 3D Proyek** (17 Nov), halaman `?page=visual3d`:
  - Letak menu: sidebar kelompok Dokumen & Lapangan (setelah Live View CCTV), menu HP, dan Ctrl K. Akun kontraktor tidak melihatnya.
  - Berkas: `src/gas/visual3d.html` (templat virtual "Visual3D"), `src/gas/visual3d.js` (rute Code.gs, patch sidebar, tombol Weekly), `src/routes/model3d.js` (API), migrasi `009-model3d.sql`.
  - Tim mengunggah **satu berkas .html mandiri** per model (mis. three.js), maks 15 MB, disimpan di Postgres (tabel `model3d`). Hanya versi terbaru: judul sama di proyek yang sama, atau pilihan "Ganti: …", menimpa berkas lama.
  - Yang boleh unggah, ganti, ubah judul, unduh asli, dan hapus: **Admin**, dan **PIC** untuk proyeknya sendiri serta sub-proyeknya (aturan sama dengan Arsip). Semua akun lain (kecuali kontraktor) hanya melihat.
  - Keamanan: `/model3d/:id/view` selalu disajikan dengan header `Content-Security-Policy: sandbox allow-scripts …` (tanpa allow-same-origin), dan iframe juga diberi `sandbox`. Skrip model tidak bisa membaca cookie sesi, memanggil API, atau menyentuh halaman induk (sudah diuji). Skrip hanya dari cdnjs, jsdelivr, unpkg; font dari Google Fonts.
  - Tema terang/gelap dashboard diteruskan ke model (`?theme=` dan postMessage `pmoTheme`).
  - Weekly Progress: tombol **Lihat model 3D** muncul di kartu judul bila proyek itu punya model.
  - Presentasi: tombol **Tambah 3D** di layar Siapkan presentasi (Executive & Weekly). Jenis item `{type:'model3d', model, pos}` di `pres_sets`. Model dimuat hanya saat slidenya tampil.

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
- Tampilan harus tetap **sama dengan versi Apps Script** kecuali diminta berbeda.
