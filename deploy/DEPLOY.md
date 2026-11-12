# Deploy ke VPS 189.31.32.97

Runbook ini memakai nilai nyata: domain `pmopetrokimia.tech`, IP `189.31.32.97`,
aplikasi dari folder `pmo-web`.

Lokasi IP: Kuala Lumpur, Hostinger (AS47583). Latensi ke Indonesia sekitar 20 sampai 40 ms.

Urutan penting. DNS lebih dulu, server kedua, sertifikat terakhir.

---

## 1. DNS (kerjakan lebih dulu)

Di Cloudflare atau DNS Hostinger, buat tiga record ini. **Proxy dimatikan dulu.**

| Type | Name | Value | TTL | Proxy |
|---|---|---|---|---|
| A | `@` | `189.31.32.97` | 300 | DNS only |
| A | `coolify` | `189.31.32.97` | 300 | DNS only |
| CNAME | `www` | `pmopetrokimia.tech` | 300 | DNS only |

Cek dari komputer Anda sebelum lanjut:

```bash
nslookup pmopetrokimia.tech
```

Harus menjawab `189.31.32.97`. Kalau belum, tunggu 5 sampai 30 menit.

Proxy dinyalakan di langkah 9, bukan sekarang. Kalau dinyalakan lebih awal,
sertifikat Let's Encrypt akan gagal dan Anda akan mengejar loop pengalihan.

---

## 2. Masuk ke server

Hostinger mengirim kata sandi root lewat email atau panel. Login pertama:

```bash
ssh root@189.31.32.97
```

Kalau diminta mengganti kata sandi, ganti dengan yang panjang dan simpan di pengelola kata sandi.

### Perketat akses

Jangan lewati bagian ini. VPS baru dipindai otomatis dalam hitungan jam.

```bash
# 1. buat pengguna kerja
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy

# 2. pindahkan kunci SSH (kalau sudah ada)
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# 3. uji dulu di terminal kedua, JANGAN tutup sesi ini
#    ssh deploy@189.31.32.97
```

Setelah login sebagai `deploy` berhasil, baru tutup akses root dan kata sandi:

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Kalau belum punya kunci SSH dan langsung menutup kata sandi, Anda terkunci di luar server.

### Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

Port 8000 (panel Coolify) sengaja belum dibuka. Aksesnya lewat terowongan SSH di langkah 4.

---

## 3. Pasang Coolify

```bash
sudo curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Proses ini memasang Docker, Traefik, dan panel. Sekitar 3 sampai 5 menit.
Jangan jalankan dua kali.

---

## 4. Buka panel tanpa membuka port

Di komputer Anda:

```bash
ssh -L 8000:localhost:8000 deploy@189.31.32.97
```

Biarkan terminal itu terbuka, lalu buka `http://localhost:8000` di browser.

Halaman pertama meminta pembuatan akun admin. Pakai email fungsional dan kata sandi panjang.
Setelah akun dibuat, panel langsung menanyakan konfirmasi. Jangan tutup terowongan sebelum selesai.

Alternatif kalau terowongan terasa merepotkan: buka port hanya untuk IP Anda.

```bash
sudo ufw allow from IP_RUMAH_ANDA to any port 8000 proto tcp
```

---

## 5. Daftarkan server

Di panel: **Servers**, pilih `localhost`, klik **Validate**.

Kalau validasi gagal, biasanya karena Docker belum selesai dipasang. Tunggu satu menit, ulangi.

---

## 6. Database

**Projects**, **New project**, beri nama `pmo`, lalu **Production**.

Di dalam project: **+ New resource**, **Database**, **PostgreSQL 16**.

| Isian | Nilai |
|---|---|
| Name | `pmo-db` |
| Database | `pmo` |
| Username | `pmo` |
| Password | hasil `openssl rand -base64 24` |
| Public port | kosongkan |

Setelah dibuat, catat **internal hostname** dan port-nya. Bentuknya seperti
`pmo-db-abc123` dan `5432`. Keduanya dipakai di langkah 8.

Skema dimuat otomatis kalau Anda menempelkan `db/schema.sql` ke tab **Execute Command**
atau memasukkannya lewat terminal database di panel.

---

## 7. Repositori

Coolify mengambil kode dari GitHub. Buat repositori dulu dari folder `pmo-web`:

```bash
cd pmo-web
git init
git add .
git commit -m "kerangka awal jalur B"
git branch -M main
git remote add origin https://github.com/USERNAME/pmo-web.git
git push -u origin main
```

Kalau repositori privat, sambungkan GitHub App di **Settings**, **Sources** lebih dulu.

---

## 8. Aplikasi

**+ New resource**, **Application**, lalu:

| Isian | Nilai |
|---|---|
| Source | repositori `pmo-web` |
| Branch | `main` |
| Build pack | Dockerfile |
| Base directory | `/` |
| Port | `3000` |
| Domain | `https://pmopetrokimia.tech` |

Tab **Environment Variables**:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://pmo:KATA_SANDI_DB@pmo-db-abc123:5432/pmo
SESSION_TTL_HOURS=6
LEGACY_PBKDF2_ITERATIONS=120000
LEGACY_PBKDF2_KEYLEN=32
```

Ganti `pmo-db-abc123` dan `KATA_SANDI_DB` dengan nilai dari langkah 6.

Klik **Deploy**. Build pertama sekitar 2 sampai 4 menit.

---

## 9. Sertifikat, lalu proxy

Setelah deploy hijau, Coolify menerbitkan sertifikat untuk `pmopetrokimia.tech`.
Syaratnya: DNS sudah mengarah ke IP ini, port 80 dan 443 terbuka, dan proxy Cloudflare masih mati.

Cek dari komputer Anda:

```bash
curl -I https://pmopetrokimia.tech/health
```

Harus `HTTP/2 200`. Kalau masih error sertifikat, tunggu dua menit lalu cek log Traefik di panel.

Baru setelah itu nyalakan proxy Cloudflare untuk record `@`, `www`, dan `coolify`,
lalu ubah SSL mode ke **Full (strict)**.

---

## 10. Backup

Di resource database: **Backups**, **New backup**.
Isi tujuan S3 compatible (Cloudflare R2 atau Backblaze B2), jadwal harian, retensi 14 hari.

Uji pemulihan sekali sebelum ada data nyata. Backup yang belum pernah dipulihkan
bukan backup, hanya harapan.

---

## 11. Verifikasi

```bash
curl -s https://pmopetrokimia.tech/health
# {"ok":true,...}

curl -s -o /dev/null -w "%{http_code}\n" https://pmopetrokimia.tech/login
# 200

curl -s -o /dev/null -w "%{http_code}\n" https://pmopetrokimia.tech/api/projects
# 401, karena belum login
```

Tiga angka itu membuktikan aplikasi hidup, halaman login terbuka, dan rute data tertutup.

---

## Perintah harian

```bash
# lihat log aplikasi
ssh deploy@189.31.32.97 'docker ps'

# restart seluruh layanan Coolify
ssh deploy@189.31.32.97 'sudo systemctl restart coolify'

# pakai disk
ssh deploy@189.31.32.97 'df -h /'
```

---

## Kalau macet

| Gejala | Penyebab tersering | Tindakan |
|---|---|---|
| Sertifikat gagal terus | proxy Cloudflare menyala | matikan proxy, deploy ulang |
| 502 Bad Gateway | container mati | cek log aplikasi di panel |
| Panel tidak terbuka | port 8000 tertutup | pakai terowongan SSH |
| Build gagal di npm ci | tidak ada package-lock.json | Dockerfile sudah memakai fallback npm install |
| Login selalu gagal | angka PBKDF2 tidak sama dengan Auth.js | cocokkan 120000 dan panjang 32 |
