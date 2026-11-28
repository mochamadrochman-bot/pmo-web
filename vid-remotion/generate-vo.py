import asyncio
import os
import edge_tts

VOICE = "id-ID-ArdiNeural"
RATE = "+4%"
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "audio")

# Gunakan ejaan fonetik yang natural untuk istilah Inggris agar pelafalan edge-tts Indonesia terdengar jelas.
SCRIPTS = [
    ("vo-01-intro", "Setiap pagi sebelum rapat pimpinan dimulai, ada satu pertanyaan yang selalu muncul: di antara puluhan proyek pengembangan yang sedang berjalan, proyek mana yang aman, dan mana yang butuh keputusan hari ini? Selama ini, laporan mingguan datang terpisah, rekap masih manual, dan waktu rapat habis untuk menyamakan angka."),
    ("vo-02-reveal", "Kini seluruh kendali portofolio proyek hadir dalam satu layar: PMO Dasbor. Begitu dibuka, pimpinan langsung melihat total proyek aktif, rata-rata realisasi, hingga deviasi di setiap proyek—terbaca dalam hitungan detik."),
    ("vo-03-epcc", "Ketika sebuah proyek menunjukkan deviasi, dasbor langsung memecah progres ke empat disiplin utama: Enjiniring, Prokyurmen, Konstraksyen, dan Komisyening—lengkap dengan Master Skejul. Pimpinan langsung tahu di titik mana hambatan terjadi."),
    ("vo-04-reports", "Pelaporan mingguan kontraktor kini terhubung dengan rumus yang seragam, otomatis tersusun menjadi laporan PDF wikli dan mode presentasi yang rapi—siap dibawa ke meja rapat tanpa salin-tempel ulang."),
    ("vo-05-visual-3d", "Melalui galeri dokumentasi lapangan dan visualisasi model tiga dimensi interaktif langsung di browser, progres fisik dapat diverifikasi secara visual kapan saja."),
    ("vo-06a-sena", "Butuh ringkasan cepat saat diskusi? Asisten AI Sena siap menjawab pertanyaan data proyek secara instan langsung dari data terbaru."),
    ("vo-06b-spotlight", "Tersedia pula mode Spotlait Lobi untuk pemantauan proyek eksekutif di layar besar ruang pimpinan."),
    ("vo-07-governance", "Semua kemudahan ini dibangun di atas tata kelola yang ketat. Hak akses dipisah tegas antara kontraktor, tim PMO, dan Direksi, sementara seluruh dokumen tersimpan aman dalam satu arsip terpusat."),
    ("vo-08-mobile-closing", "Dapat diakses nyaman dari laptop maupun perangkat mobail hingga menu Eksekutif Manli, PMO Dasbor memastikan rapat pimpinan fokus pada strategi dan keputusan. PMO Dasbor: kendali penuh di setiap progres proyek."),
]

async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for key, text in SCRIPTS:
        out_path = os.path.join(OUT_DIR, f"{key}.mp3")
        comm = edge_tts.Communicate(text, VOICE, rate=RATE)
        await comm.save(out_path)
        print(f"Generated {out_path}")

if __name__ == "__main__":
    asyncio.run(main())
