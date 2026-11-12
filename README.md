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
