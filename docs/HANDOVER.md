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

### R3 — Kelompok proyek tahap 3 (ditunda atas permintaan pemilik)
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
- **Belum dibuat:** menu melayang saat sidebar diciutkan (hover ikon grup).

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
