import React from 'react';
import { Sequence, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { Device3DFrame, ExecutiveBackdrop } from './components/Device3DFrame';
import senaTimes from './sena-times.json';
import { TitleIntroScene } from './scenes/TitleIntroScene';
import { MobileSplitScene } from './scenes/MobileSplitScene';
import { ClosingScene } from './scenes/ClosingScene';

export type PmoPresentationProps = {
  externalCctvFile?: string;
};

export const PmoPresentation: React.FC<PmoPresentationProps> = ({
  externalCctvFile,
}) => {
  const { fps } = useVideoConfig();

  // Timeline offsets in frames (30 fps), synced to VO audio & post-loading video segments
  const s1Start = 0;
  const s1Dur = 19 * fps; // 570: Intro Morning Friction (VO ~18.1s)

  const s2Start = s1Start + s1Dur;
  const s2Dur = 15 * fps; // 450: Reveal Portal -> Executive (VO ~14.0s)

  const s3Start = s2Start + s2Dur;
  const s3Sub = Math.round(3.3 * fps); // 99 frames per EPCC sub-menu
  const s3Dur = s3Sub * 5; // 495 (16.5s): E, P, C, Comm, Master Schedule

  const s4Start = s3Start + s3Dur;
  const s4Dur = 12 * fps; // 360: Management & Monthly Report

  const s5Start = s4Start + s4Dur;
  const s5Dur = 10 * fps; // 300: Gallery + 3D Model / CCTV slot

  const s6Start = s5Start + s5Dur;
  const s6SenaDur = 13 * fps; // 390: AI Sena full question + full answer + right-drawer zoom
  const s6SpotDur = 7 * fps; // 210: Spotlight Lobby (trimmed past loading)
  const s6Dur = s6SenaDur + s6SpotDur; // 600 (20s)

  const s7Start = s6Start + s6Dur;
  const s7Dur = 13 * fps; // 390: Governance & Arsip (trimmed past loading)

  const s8Start = s7Start + s7Dur;
  const s8MobileDur = Math.round(13.5 * fps); // 405: Dual Mobile Split + selesai VO-08 sebelum Sena bicara
  const s8CloseDur = 11 * fps; // 330: Closing with Sena Video (bersuara) + Glowing PMO Logo

  return (
    <div style={{ flex: 1, position: 'relative', background: '#040d18' }}>
      {/* Latar tetap di bawah semua babak, supaya perpindahan scene tidak berkedip hitam */}
      <ExecutiveBackdrop />
      {/* Babak 1: The Morning Friction */}
      <Sequence name="01. Morning Friction" from={s1Start} durationInFrames={s1Dur}>
        <TitleIntroScene />
        <Audio src={staticFile('audio/vo-01-intro.mp3')} />
      </Sequence>

      {/* Babak 2: The Reveal (Portal & Executive Dashboard, no cropping zoom) */}
      <Sequence name="02. Portal & Executive Reveal" from={s2Start} durationInFrames={s2Dur}>
        <Device3DFrame
          clipSrc="clips/clip1-portal-executive.webm"
          eyebrow="Single Source of Truth"
          title="Portal Proyek & Executive Dashboard"
          subtitle="Pantau realisasi, deviasi, dan kesehatan seluruh portofolio dalam satu layar"
          urlLabel="pmopetrokimia.tech/app?page=executive"
          segments={[
            { from: 2, dur: 7 }, // Portal: hero lalu ringkasan proyek
            { from: 13.2, dur: 8 }, // Monthly Executive Review (melewati layar loading 9-13 dtk)
          ]}
        />
        <Audio src={staticFile('audio/vo-02-reveal.mp3')} />
      </Sequence>

      {/* Babak 3A: EPCC Control (E, P, C, Comm) & Master Schedule */}
      <Sequence name="03a. EPCC Engineering" from={s3Start} durationInFrames={s3Sub}>
        <Device3DFrame
          clipSrc="clips/clip2a-epcc-engineering.webm"
          eyebrow="EPCC Control • Engineering"
          title="Progres Disiplin Engineering"
          subtitle="Proyek: Tangki Asam Sulfat 2x20.000 Ton"
          urlLabel="pmopetrokimia.tech/app?page=engineering"
          playbackRate={1.3}
          startFrom={2 * fps}
        />
      </Sequence>
      <Sequence name="03b. EPCC Procurement" from={s3Start + s3Sub} durationInFrames={s3Sub}>
        <Device3DFrame
          clipSrc="clips/clip2b-epcc-procurement.webm"
          eyebrow="EPCC Control • Procurement"
          title="Progres Disiplin Procurement"
          subtitle="Proyek: Tangki Asam Sulfat 2x20.000 Ton"
          urlLabel="pmopetrokimia.tech/app?page=procurement"
          playbackRate={1.3}
          startFrom={2 * fps}
        />
      </Sequence>
      <Sequence name="03c. EPCC Construction" from={s3Start + s3Sub * 2} durationInFrames={s3Sub}>
        <Device3DFrame
          clipSrc="clips/clip2c-epcc-construction.webm"
          eyebrow="EPCC Control • Construction"
          title="Progres Disiplin Construction"
          subtitle="Proyek: Tangki Asam Sulfat 2x20.000 Ton"
          urlLabel="pmopetrokimia.tech/app?page=construction"
          playbackRate={1.3}
          startFrom={2 * fps}
        />
      </Sequence>
      <Sequence name="03d. EPCC Commissioning" from={s3Start + s3Sub * 3} durationInFrames={s3Sub}>
        <Device3DFrame
          clipSrc="clips/clip2d-epcc-commissioning.webm"
          eyebrow="EPCC Control • Commissioning"
          title="Progres Disiplin Commissioning"
          subtitle="Proyek: Tangki Asam Sulfat 2x20.000 Ton"
          urlLabel="pmopetrokimia.tech/app?page=commissioning"
          playbackRate={1.3}
          startFrom={2 * fps}
        />
      </Sequence>
      <Sequence name="03e. Master Schedule" from={s3Start + s3Sub * 4} durationInFrames={s3Sub}>
        <Device3DFrame
          clipSrc="clips/clip2e-master-schedule.webm"
          eyebrow="Master Schedule"
          title="Jadwal Induk & Realisasi Monitoring"
          subtitle="Proyek: Tangki Asam Sulfat 2x20.000 Ton"
          urlLabel="pmopetrokimia.tech/app?page=master"
          playbackRate={1.3}
          startFrom={2 * fps}
        />
      </Sequence>
      <Sequence name="Audio 03 EPCC" from={s3Start} durationInFrames={s3Dur}>
        <Audio src={staticFile('audio/vo-03-epcc.mp3')} />
      </Sequence>

      {/* Babak 3B: Laporan Weekly (PDF sudah terload) & Presentasi Weekly Progress */}
      <Sequence name="04. Laporan Weekly & Presentasi" from={s4Start} durationInFrames={s4Dur}>
        <Device3DFrame
          clipSrc="clips/clip3-reports.webm"
          eyebrow="Automated Reporting"
          title="Laporan Weekly PDF & Mode Presentasi"
          subtitle="Rekap mingguan & presentasi progres otomatis siap rapat pimpinan"
          urlLabel="pmopetrokimia.tech/app?page=weeklyprint"
          segments={[
            { from: 15, dur: 6, rate: 1.25 }, // PDF Laporan Weekly sudah tampil + digulir (melewati loading 11-14 dtk)
            { from: 24, dur: 6, rate: 1.0 }, // Weekly Progress mode presentasi
          ]}
        />
        <Audio src={staticFile('audio/vo-04-reports.mp3')} />
      </Sequence>

      {/* Babak 3C: Galeri Foto Penuh (5s) + Model 3D Tangki Layar Penuh & Zoom (5s) */}
      <Sequence name="05a. Galeri Foto Lapangan" from={s5Start} durationInFrames={5 * fps}>
        <Device3DFrame
          clipSrc="clips/clip4b-gallery.webm"
          eyebrow="Visual Verification • Galeri"
          title="Galeri Dokumentasi Foto Lapangan"
          subtitle="Rekam jejak visual progres fisik proyek tersimpan rapi"
          urlLabel="pmopetrokimia.tech/app?page=executive"
          playbackRate={1.0}
          startFrom={Math.round(18.3 * fps)}
          zoomSteps={[
            { atSec: 0, scale: 1.0, originX: 50, originY: 40 },
            { atSec: 5, scale: 1.08, originX: 50, originY: 40 },
          ]}
        />
      </Sequence>
      <Sequence name="05b. Model 3D Tangki" from={s5Start + 5 * fps} durationInFrames={5 * fps}>
        <Device3DFrame
          clipSrc={externalCctvFile || 'clips/clip4-visual-3d.webm'}
          eyebrow="Visual Verification • 3D"
          title={externalCctvFile ? 'Live View CCTV Lapangan' : 'Model 3D Tangki Asam Sulfat'}
          subtitle="Visualisasi model 3D interaktif langsung di dalam browser"
          urlLabel="pmopetrokimia.tech/app?page=visual3d"
          playbackRate={1.0}
          startFrom={externalCctvFile ? 0 : Math.round(23.9 * fps)}
          zoomSteps={
            externalCctvFile
              ? undefined
              : [
                  { atSec: 0, scale: 1.0, originX: 52, originY: 50 },
                  { atSec: 5, scale: 1.3, originX: 52, originY: 50 },
                ]
          }
        />
      </Sequence>
      <Sequence name="Audio 05 Visual & 3D" from={s5Start} durationInFrames={s5Dur}>
        <Audio src={staticFile('audio/vo-05-visual-3d.mp3')} />
      </Sequence>

      {/* Babak 3D: AI Sena (speed up 1.8x agar ketikan & jawaban penuh tampil) & Spotlight Lobby (skip 15s awal) */}
      <Sequence name="06a. AI Assistant Sena" from={s6Start} durationInFrames={s6SenaDur}>
        <Device3DFrame
          clipSrc="clips/clip7-ai-sena.webm"
          eyebrow="AI Assistant • Sena"
          title="Tanya Jawab Data Proyek Secara Instan"
          subtitle="Sena merangkum progres & deviasi proyek langsung dari data terbaru"
          urlLabel="pmopetrokimia.tech/app?page=executive"
          // Titik potong diisi otomatis oleh record-clips.mjs (src/sena-times.json)
          segments={[
            { from: senaTimes.typingFrom, dur: 4.5, rate: 1.0 }, // panel Sena terbuka + pertanyaan diketik
            { from: senaTimes.answerFrom, dur: 8.5, rate: 1.0 }, // jawaban tampil lalu digulir
          ]}
          zoomSteps={[
            { atSec: 0, scale: 1.0, originX: 100, originY: 50 },
            { atSec: 1.0, scale: 3.0, originX: 100, originY: 100 }, // kotak tanya Sena
            { atSec: 4.3, scale: 3.0, originX: 100, originY: 100 },
            { atSec: 5.0, scale: 3.0, originX: 100, originY: 0 }, // awal jawaban
            { atSec: 13, scale: 3.0, originX: 100, originY: 35 },
          ]}
        />
        <Audio src={staticFile('audio/vo-06a-sena.mp3')} />
      </Sequence>
      <Sequence name="06b. Spotlight Lobby" from={s6Start + s6SenaDur} durationInFrames={s6SpotDur}>
        <Device3DFrame
          clipSrc="clips/clip8-spotlight.webm"
          eyebrow="Executive Display"
          title="Spotlight Lobby TV"
          subtitle="Pemantauan ringkas di layar besar ruang pimpinan & lobby"
          urlLabel="pmopetrokimia.tech/app?page=spotlight"
          playbackRate={1.0}
          startFrom={Math.round(39.5 * fps)}
        />
        <Audio src={staticFile('audio/vo-06b-spotlight.mp3')} />
      </Sequence>

      {/* Babak 4: Governance & Arsip (trimmed past initial loading) */}
      <Sequence name="07. Governance & Arsip" from={s7Start} durationInFrames={s7Dur}>
        <Device3DFrame
          clipSrc="clips/clip5-governance.webm"
          eyebrow="Tata Kelola & Keamanan"
          title="Hak Akses Terpisah & Arsip Terpusat"
          subtitle="Kontraktor, PIC PMO, hingga Direksi dalam database terintegrasi"
          urlLabel="pmopetrokimia.tech/arsip"
          playbackRate={1.0}
          startFrom={4 * fps}
        />
        <Audio src={staticFile('audio/vo-07-governance.mp3')} />
      </Sequence>

      {/* Babak 5: Dual Mobile Split (Portal -> Executive Monthly) + Sena Closing (bersuara) */}
      <Sequence name="08a. Mobile Executive Monthly" from={s8Start} durationInFrames={s8MobileDur}>
        <MobileSplitScene />
        <Audio src={staticFile('audio/vo-08-mobile-closing.mp3')} />
      </Sequence>
      <Sequence name="08b. Closing" from={s8Start + s8MobileDur} durationInFrames={s8CloseDur}>
        <ClosingScene />
      </Sequence>
    </div>
  );
};
