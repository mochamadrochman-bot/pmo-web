import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.PMO_URL || 'https://pmopetrokimia.tech').replace(/\/$/, '');
const AUTH_FILE = path.join(__dirname, '.auth.json');
const CLIPS_DIR = path.join(__dirname, 'clips');

const isAuthMode = process.argv.includes('--auth');
const isHeaded = isAuthMode || process.argv.includes('--headed');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyClips = onlyArg ? new Set(onlyArg.replace('--only=', '').split(',').map((s) => s.trim())) : null;
const shouldRecord = (key) => !onlyClips || onlyClips.has(key);

/** Smooth scroll helper for natural executive-paced recording. */
async function smoothScroll(page, targetY, steps = 30, delayMs = 45) {
  const startY = await page.evaluate(() => window.scrollY);
  const delta = targetY - startY;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    await page.evaluate((y) => window.scrollTo(0, y), startY + delta * ease);
    await page.waitForTimeout(delayMs);
  }
}

/** Tutup overlay intro Portal (.v-first) jika muncul agar konten dashboard langsung terlihat. */
async function dismissPortalIntro(page) {
  await page.evaluate(() => {
    const el = document.querySelector('.v-first');
    if (el) el.remove();
  }).catch(() => {});
}

/** Pilih proyek Tangki Asam Sulfat atau Pabrik Fosfat jika dropdown proyek tersedia. */
async function selectTargetProject(page) {
  const picked = await page.evaluate(() => {
    const selectors = ['#projSel', 'select[aria-label*="proyek" i]', 'select'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el || !el.options || !el.options.length) continue;
      const opts = Array.from(el.options);
      const match =
        opts.find((o) => /asam\s*sulfat/i.test(o.textContent || o.value)) ||
        opts.find((o) => /fosfat/i.test(o.textContent || o.value));
      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return match.textContent.trim();
      }
    }
    return null;
  });

  if (picked) {
    console.log(`  -> Proyek terpilih: ${picked}`);
    await page.waitForTimeout(2500);
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return picked;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: !isHeaded });
  } catch {
    return await chromium.launch({ headless: !isHeaded });
  }
}

async function runAuthFlow() {
  console.log(`Membuka ${BASE_URL}/login untuk menyimpan sesi login...`);
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  const user = process.env.PMO_USER;
  const pass = process.env.PMO_PASS;
  if (user && pass) {
    await page.fill('#username', user);
    await page.fill('#password', pass);
    await page.click('button[type="submit"]');
  } else {
    console.log('Silakan login manual di jendela Chrome yang terbuka. Skrip akan menunggu sampai masuk ke Portal...');
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 180000 });
  await page.waitForTimeout(2000);
  await context.storageState({ path: AUTH_FILE });
  console.log(`Sesi login tersimpan di: ${AUTH_FILE}`);
  await browser.close();
}

async function recordClip(browser, name, viewport, fn) {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: CLIPS_DIR, size: viewport },
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    console.log(`Merekam ${name}...`);
    await fn(page);
  } finally {
    await context.close();
    if (video) {
      const rawPath = await video.path();
      const targetPath = path.join(CLIPS_DIR, `${name}.webm`);
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(rawPath, targetPath);
      console.log(`Tersimpan: ${targetPath}`);
    }
  }
}

async function main() {
  if (isAuthMode) {
    await runAuthFlow();
    return;
  }

  if (!fs.existsSync(AUTH_FILE)) {
    console.error('File sesi .auth.json belum ada. Jalankan dulu: npm run auth');
    process.exit(1);
  }

  const browser = await launchBrowser();
  const desktop = { width: 1920, height: 1080 };
  const targetProjectParam = encodeURIComponent('TANGKI ASAM SULFAT 2X20.000 TON');

  try {
    // Clip 1: Portal Proyek -> Executive Dashboard (tutup overlay intro agar langsung tampil kartu proyek)
    if (shouldRecord('clip1')) await recordClip(browser, 'clip1-portal-executive', desktop, async (page) => {
      await page.goto(`${BASE_URL}/app?page=portal`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await dismissPortalIntro(page);
      await page.waitForTimeout(2500);
      await smoothScroll(page, 450, 35, 50);
      await page.waitForTimeout(1800);
      await page.goto(`${BASE_URL}/app?page=executive`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await smoothScroll(page, 450, 35, 50);
      await page.waitForTimeout(2000);
    });

    // Clip 2a-2d: EPCC Control per disiplin (Engineering, Procurement, Construction, Commissioning)
    const epccPages = [
      ['clip2a', 'clip2a-epcc-engineering', 'engineering'],
      ['clip2b', 'clip2b-epcc-procurement', 'procurement'],
      ['clip2c', 'clip2c-epcc-construction', 'construction'],
      ['clip2d', 'clip2d-epcc-commissioning', 'commissioning'],
    ];
    for (const [key, filename, pageName] of epccPages) {
      if (shouldRecord('clip2') || shouldRecord(key)) {
        await recordClip(browser, filename, desktop, async (page) => {
          await page.goto(`${BASE_URL}/app?page=${pageName}&project=${targetProjectParam}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2500);
          await selectTargetProject(page);
          await page.waitForTimeout(2000);
          await smoothScroll(page, 420, 30, 50);
          await page.waitForTimeout(2000);
        });
      }
    }

    // Clip 2e: Master Schedule (page=master)
    if (shouldRecord('clip2') || shouldRecord('clip2e')) {
      await recordClip(browser, 'clip2e-master-schedule', desktop, async (page) => {
        await page.goto(`${BASE_URL}/app?page=master&project=${targetProjectParam}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2500);
        await selectTargetProject(page);
        await page.waitForTimeout(2500);
        await smoothScroll(page, 400, 30, 50);
        await page.waitForTimeout(2000);
      });
    }

    // Clip 3: Buat Laporan Weekly (tunggu loading selesai -> scroll ke PDF preview) + Mode Presentasi di Weekly Progress
    if (shouldRecord('clip3')) await recordClip(browser, 'clip3-reports', desktop, async (page) => {
      await page.goto(`${BASE_URL}/app?page=weeklyprint&project=${targetProjectParam}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5500);
      await selectTargetProject(page);
      await page.waitForTimeout(4000);
      await smoothScroll(page, 950, 45, 55);
      await page.waitForTimeout(3000);

      await page.goto(`${BASE_URL}/app?page=weekly&project=${targetProjectParam}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(4500);
      await selectTargetProject(page);
      await page.waitForTimeout(2000);
      const presBtn = page.locator('button:has-text("Presentasi")').first();
      if (await presBtn.isVisible().catch(() => false)) {
        await presBtn.click();
        await page.waitForTimeout(4500);
      }
    });

    // Clip 4: Model 3D Tangki (tunggu WebGL selesai render) + Clip 4b: Galeri Foto Utama
    if (shouldRecord('clip4')) {
      await recordClip(browser, 'clip4-visual-3d', desktop, async (page) => {
        await page.goto(`${BASE_URL}/app?page=visual3d`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(4000);
        const tangkiBtn = page.locator('button:has-text("Tangki"), [role="button"]:has-text("Tangki"), .m3-item:has-text("Tangki"), div:has-text("Tangki")').last();
        if (await tangkiBtn.isVisible().catch(() => false)) {
          await tangkiBtn.click().catch(() => {});
        }
        // Model Tangki 14.5 MB: tunggu 16 detik sampai terload penuh, lalu klik Layar penuh
        await page.waitForTimeout(16000);
        const fullBtn = page.locator('button:has-text("Layar penuh")').first();
        if (await fullBtn.isVisible().catch(() => false)) {
          await fullBtn.click().catch(() => {});
        }
        await page.waitForTimeout(6000);
      });

      await recordClip(browser, 'clip4b-gallery', desktop, async (page) => {
        await page.goto(`${BASE_URL}/app?page=executive`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(4500);
        const clicked = await page.evaluate(() => {
          if (window.pmoGallery && typeof window.pmoGallery.open === 'function') {
            window.pmoGallery.open({});
            return true;
          }
          const btn = Array.from(document.querySelectorAll('button')).find((b) => /galeri/i.test(b.textContent || ''));
          if (btn) { btn.click(); return true; }
          return false;
        });
        console.log('  -> Galeri dibuka:', clicked);
        await page.waitForTimeout(3500);
        await smoothScroll(page, 380, 30, 50);
        await page.waitForTimeout(3500);
      });
    }

    // Clip 5: Arsip Materi & Tata Kelola Akun (tunggu loading selesai)
    if (shouldRecord('clip5')) await recordClip(browser, 'clip5-governance', desktop, async (page) => {
      await page.goto(`${BASE_URL}/arsip`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      await smoothScroll(page, 350, 30, 50);
      await page.waitForTimeout(2000);
      await page.goto(`${BASE_URL}/admin/akun`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(4000);
    });

    // Clip 6a & 6b: Dual Mobile View (Portal Mobile + Executive Monthly Mobile)
    if (shouldRecord('clip6')) {
      await recordClip(browser, 'clip6a-mobile-portal', { width: 430, height: 932 }, async (page) => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await smoothScroll(page, 380, 30, 45);
        await page.waitForTimeout(2000);
      });

      await recordClip(browser, 'clip6b-mobile-exec', { width: 430, height: 932 }, async (page) => {
        await page.goto(`${BASE_URL}/app?page=executive`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        await smoothScroll(page, 520, 35, 45);
        await page.waitForTimeout(2500);
      });
    }

    // Clip 7: Interaksi Asisten AI "Sena" (tunggu sampai jawaban penuh muncul)
    if (shouldRecord('clip7')) await recordClip(browser, 'clip7-ai-sena', desktop, async (page) => {
      const t0 = Date.now(); // video mulai saat halaman dibuat
      const sec = () => Math.round((Date.now() - t0) / 100) / 10;
      const times = { typingFrom: 4, answerFrom: 9 };
      await page.goto(`${BASE_URL}/app?page=executive`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3500);
      const fab = page.locator('.aic-fab').first();
      if (await fab.isVisible().catch(() => false)) {
        await fab.click();
        await page.waitForTimeout(1200);
        const input = page.locator('.aic-box textarea').first();
        if (await input.isVisible().catch(() => false)) {
          await input.click();
          times.typingFrom = Math.max(0, sec() - 0.6);
          await input.type('Ringkas progres proyek Tangki Asam Sulfat minggu ini', { delay: 25 });
          await page.waitForTimeout(500);
          const sendBtn = page.locator('.aic-box .aic-send').first();
          await sendBtn.click();
          // Sena v2 menjawab lewat job di server (bisa 20-90 detik). Tunggu sampai baris "sedang membaca data…" hilang.
          await page.waitForTimeout(1500);
          await page.waitForFunction(() => !document.getElementById('aicStep'), null, { timeout: 150000 }).catch(() => {});
          times.answerFrom = Math.max(0, sec() - 1.0);
          const kuota = await page.locator('text=Batas 5 pertanyaan').count().catch(() => 0);
          if (kuota) console.log('  !! Sena menolak: batas 5 pertanyaan/hari tercapai. Rekam ulang besok atau minta admin menaikkan SENA_DAILY_LIMIT sementara.');
          // Gulir isi jawaban pelan-pelan supaya terbaca di video (8 detik)
          await page.evaluate(() => { const a = [...document.querySelectorAll('.aic-a')].pop(); if (a) a.scrollIntoView({ block: 'start' }); });
          await page.waitForTimeout(1200);
          for (let i = 0; i < 16; i++) {
            await page.evaluate(() => { const b = document.querySelector('.aic-b'); if (b) b.scrollBy({ top: 70, behavior: 'smooth' }); });
            await page.waitForTimeout(500);
          }
          await page.waitForTimeout(1500);
          // Titik potong otomatis untuk Remotion (src/sena-times.json)
          fs.writeFileSync(path.join(__dirname, 'src', 'sena-times.json'), JSON.stringify(times, null, 2) + '\n');
          console.log(`  -> titik potong Sena: mulai mengetik ${times.typingFrom}s, jawaban ${times.answerFrom}s`);
        }
      } else {
        console.log('  -> Widget .aic-fab tidak ditemukan/tersembunyi untuk akun ini.');
        await page.waitForTimeout(2000);
      }
    });

    // Clip 8: Menu Spotlight (tunggu 15 detik melewati animasi Sena & loading, lalu rekam view proyek)
    if (shouldRecord('clip8')) await recordClip(browser, 'clip8-spotlight', desktop, async (page) => {
      await page.goto(`${BASE_URL}/app?page=spotlight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(7000);
      await page.locator('#introSkip').click().catch(() => {});
      await page.waitForTimeout(8000);
      await smoothScroll(page, 260, 25, 50);
      await page.waitForTimeout(6000);
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
