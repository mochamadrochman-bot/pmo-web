# PMO Dashboard - kerangka Jalur B (B2)

Kerangka aplikasi Node.js + Express + Postgres untuk migrasi dari Google Apps Script.
Tahap ini **belum** memuat logika bisnis. Tujuannya: satu aplikasi yang menyala lokal,
punya healthcheck, dan siap dideploy ke Coolify pada B6.

## Isi

| Berkas | Fungsi |
|---|---|
| `src/server.js` | Rute publik, middleware sesi, penanganan galat, healthcheck |
| `src/db.js` | Connection pool, query helper, pengukuran query lambat |
| `src/session.js` | Sesi di Postgres, cookie httpOnly |
| `src/routes/auth.js` | Login, logout, migrasi PBKDF2 ke argon2id |
| `src/routes/projects.js` | Contoh rute baca yang dijaga sesi |
| `src/middleware/auth.js` | `requireUser`, `requireRole`, daftar rute publik, audit |
| `db/schema.sql` | users, sessions, projects, items, progress, audit_log |

## Menjalankan lokal

```bash
cp .env.example .env
docker compose up --build
```

Buka http://localhost:3000/health. Jawaban yang benar: `{"ok":true,...}`.

Halaman `/` memerlukan login. Tambahkan satu akun uji setelah database menyala:

```bash
docker compose exec db psql -U pmo -d pmo -c \
  "insert into users (username, full_name, role, hash, algo) values ('uji','Akun Uji','admin','x','argon2id');"
```

Hash `'x'` tidak bisa dipakai login. Untuk akun yang benar-benar bisa dipakai, buat
lewat skrip kecil yang memanggil `argon2.hash` lalu simpan hasilnya.

## Yang sudah jalan

- Healthcheck yang memeriksa koneksi database, cocok untuk Coolify.
- Sesi server-side: cookie httpOnly, tidak ada token di localStorage.
- Rute publik ditulis eksplisit di satu tempat (`PUBLIC_PATHS`).
- Penanganan galat yang tidak membocorkan stack trace ke klien.
- Migrasi password lama: PBKDF2 diverifikasi, lalu di-rehash ke argon2id saat login berhasil.

## Yang belum

- 36 endpoint lain dari inventaris B1.
- Halaman Portal, Weekly, Executive, dan seterusnya (B5).
- Pemuat data dari CSV (B3).
- Uji otomatis. CI saat ini hanya memeriksa sintaks dan build image.
- CSP masih dimatikan karena halaman lama memakai style inline. Nyalakan setelah aset dipisah.

## Sebelum dipakai di server

1. Ganti `POSTGRES_PASSWORD` dan jangan pakai nilai contoh.
2. Set `NODE_ENV=production` supaya cookie `secure` aktif.
3. Pastikan HTTPS aktif di depan aplikasi, kalau tidak cookie tidak akan dikirim.
4. Jangan menaruh `.env` di repositori. Di Coolify, isi lewat Environment Variables.

## Deploy

Panduan lengkap ada di [deploy/DEPLOY.md](deploy/DEPLOY.md), memakai domain
`pmopetrokimia.tech` dan VPS `189.31.32.97`.

| Berkas | Kegunaan |
|---|---|
| `deploy/DEPLOY.md` | Urutan lengkap: DNS, hardening, Coolify, database, aplikasi, sertifikat, backup |
| `deploy/.env.production.example` | Daftar variabel lingkungan produksi |
| `docker-compose.prod.yml` | Alternatif satu compose, untuk resource Docker Compose di Coolify |

## Peran dan akses (Tahap A)

Aturan ada di satu tempat: `src/lib/access.js`. Tampilan hanya menyembunyikan tombol;
pemeriksaan sebenarnya selalu di server.

| Peran | Lihat proyek | Edit proyek | Modul |
|---|---|---|---|
| admin | semua | semua | semua + Kelola Akun |
| input (INPUT/PIC lama) | semua | hanya `project_ids` | semua kecuali Kelola Akun |
| kontraktor | hanya `project_ids` | hanya `project_ids`, modul EPCC | Portal + EPCC |
| viewer | semua | tidak ada | semua kecuali Kelola Akun |

- Peran dan kolom PROYEK dari sheet USER ACCESS diterjemahkan otomatis oleh
  `db/migrations/001-auth.sql` saat aplikasi start (sekali per akun). Setelah itu,
  ubah lewat halaman **Kelola Akun** (`/admin/akun`).
- Password salah 5 kali: akun dikunci 15 menit (`LOGIN_MAX_FAILED`, `LOGIN_LOCK_MINUTES`).
- Akun baru dan akun yang direset Admin wajib mengganti password saat login berikutnya.
- Migrasi di `db/migrations/*.sql` dijalankan otomatis setiap start. `db/10-core-from-staging.sql`
  tidak ikut, karena mengosongkan data proyek; jalankan manual hanya saat pindah data,
  lalu restart aplikasi supaya cakupan proyek akun baru diterjemahkan.

## Aplikasi lama di server baru (Tahap C)

Halaman Apps Script lama (`legacy/`) dijalankan apa adanya di Node.js lewat lapisan kompatibilitas di `src/gas/`:

| Berkas | Isi |
|---|---|
| `src/gas/sheets.js` | Pengganti `SpreadsheetApp` (Spreadsheet, Sheet, Range) |
| `src/gas/services.js` | Pengganti `CacheService`, `PropertiesService`, `LockService`, `Utilities`, `HtmlService`, dll. |
| `src/gas/store.js` | Isi spreadsheet disimpan di tabel `gas_sheets`, dimuat ke memori saat start |
| `src/gas/runtime.js` | Menjalankan semua `.gs` per permintaan (variabel selalu baru, seperti Apps Script) |
| `src/gas/xlsx-import.js` | Membaca unduhan `.xlsx` dari Google Sheets |
| `src/routes/gas.js` | `GET /app?page=...` (doGet) dan `POST /app/rpc/:fungsi` (google.script.run) |

- Data diisi lewat **Impor Data** (`/admin/data`): unggah `.xlsx` hasil *File → Download* dari Google Sheets.
- **Mode baca-saja** aktif secara bawaan (`GAS_READONLY` selain `0`): perubahan data lewat halaman lama dibatalkan,
  karena rumus spreadsheet belum dihitung ulang di server. Input tetap di aplikasi lama, lalu impor ulang.
- Fitur yang memakai Google Drive, UrlFetch (Sena/AI), dan email menampilkan pesan "belum tersedia" sampai tahap berikutnya.
- Untuk memperbarui kode lama: salin ulang berkas dari Apps Script ke `legacy/` (urutan berkas `.gs` ada di `legacy/order.json`).
