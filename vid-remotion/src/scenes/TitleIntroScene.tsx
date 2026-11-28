import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ExecutiveBackdrop } from '../components/Device3DFrame';

type FloatingDoc = {
  id: string;
  tag: string;
  title: string;
  meta: string;
  badge: string;
  color: string;
  x: number;
  y: number;
  rot: number;
  delaySec: number;
};

const FLOATING_DOCS: FloatingDoc[] = [
  {
    id: 'xlsx-1',
    tag: 'XLSX',
    title: 'Laporan_Mingguan_W24_FINAL_v3.xlsx',
    meta: 'Kontraktor A • 14 sheet terpisah',
    badge: 'Rumus #REF!',
    color: '#22c55e',
    x: 110,
    y: 130,
    rot: -6,
    delaySec: 1.5,
  },
  {
    id: 'pdf-1',
    tag: 'PDF',
    title: 'Progress_Tangki_Asam_Sulfat.pdf',
    meta: 'Email lampiran • 42 MB',
    badge: 'Belum Direkap',
    color: '#ef4444',
    x: 1320,
    y: 120,
    rot: 7,
    delaySec: 2.8,
  },
  {
    id: 'chat-1',
    tag: 'CHAT',
    title: 'Revisi Angka Deviasi Fosfat?',
    meta: 'Grup WhatsApp Proyek • 07:45 WIB',
    badge: 'Versi Beda',
    color: '#f59e0b',
    x: 85,
    y: 690,
    rot: 4,
    delaySec: 4.5,
  },
  {
    id: 'xlsx-2',
    tag: 'XLSX',
    title: 'Master_Schedule_Update_Rev08.xlsx',
    meta: 'Unit Engineering • Manual Copy-Paste',
    badge: 'Menunggu PIC',
    color: '#38bdf8',
    x: 1310,
    y: 675,
    rot: -5,
    delaySec: 6.2,
  },
  {
    id: 'mail-1',
    tag: 'EMAIL',
    title: 'RE: RE: Fwd: Update Progres Fosfat (final)',
    meta: 'Kotak masuk • 23 balasan belum dibaca',
    badge: 'Data Lama',
    color: '#a78bfa',
    x: 725,
    y: 52,
    rot: -3,
    delaySec: 8.6,
  },
  {
    id: 'pdf-2',
    tag: 'PDF',
    title: 'Kurva_S_Konsolidasi_Oktober_rev2.pdf',
    meta: 'Scan cetak • 3 versi beredar',
    badge: 'Tidak Sinkron',
    color: '#ef4444',
    x: 715,
    y: 842,
    rot: 3,
    delaySec: 11.2,
  },
];

export const TitleIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const timeOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineOpacity = interpolate(frame, [fps * 1.0, fps * 1.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(frame, [fps * 1.0, fps * 1.8], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const convergeStart = durationInFrames - Math.round(fps * 2.4);
  const convergeProgress = interpolate(
    frame,
    [convergeStart, durationInFrames - 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.65, 0, 0.35, 1) }
  );

  const hubOpacity = interpolate(
    frame,
    [convergeStart + 16, durationInFrames - 12],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const glowPulse = 0.65 + 0.35 * Math.sin(frame / 6);

  // Kamera mendorong pelan + jam berjalan menuju rapat, supaya 16 detik awal tidak diam
  const push = interpolate(frame, [0, convergeStart], [1, 1.07], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.67, 1),
  });
  const minute = Math.min(59, 45 + Math.floor(interpolate(frame, [fps * 1.2, convergeStart], [0, 14.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const minsLeft = 60 - minute;
  const textOut = interpolate(frame, [convergeStart - 6, convergeStart + 14], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <ExecutiveBackdrop />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${push})`, transformOrigin: '50% 50%' }}>
      {FLOATING_DOCS.map((doc, idx) => {
        const enterFrame = Math.round(doc.delaySec * fps);
        const docOpacity = interpolate(frame, [enterFrame, enterFrame + 18], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const floatY = Math.sin((frame + idx * 20) / 18) * 10;
        const curX = interpolate(convergeProgress, [0, 1], [doc.x, 760]);
        const curY = interpolate(convergeProgress, [0, 1], [doc.y, 460]);
        const curScale = interpolate(convergeProgress, [0, 1], [1, 0.25]);
        const curAlpha = docOpacity * (1 - convergeProgress * 0.9);

        return (
          <div
            key={doc.id}
            style={{
              position: 'absolute',
              left: curX,
              top: curY + floatY,
              width: 470,
              padding: '20px 22px',
              borderRadius: 16,
              background: 'rgba(15, 29, 48, 0.88)',
              border: `1px solid ${doc.color}44`,
              boxShadow: '0 24px 55px rgba(0, 0, 0, 0.45)',
              transform: `rotate(${doc.rot * (1 - convergeProgress)}deg) scale(${curScale})`,
              opacity: curAlpha,
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: `${doc.color}22`,
                  color: doc.color,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                {doc.tag}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(239, 68, 68, 0.16)',
                  color: '#fca5a5',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {doc.badge}
              </span>
            </div>
            <div style={{ color: '#f1f5f9', fontSize: 19, fontWeight: 700, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.title}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 14.5 }}>{doc.meta}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 14 }}>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(148, 163, 184, 0.22)' }} />
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(148, 163, 184, 0.14)' }} />
              <div style={{ height: 8, borderRadius: 4, background: `${doc.color}44` }} />
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          textAlign: 'center',
          maxWidth: 1400,
          opacity: textOut,
          transform: `scale(${1 - convergeProgress * 0.1})`,
        }}
      >
        <div
          style={{
            opacity: timeOpacity,
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 22px',
            borderRadius: 999,
            background: 'rgba(18, 101, 170, 0.24)',
            border: '1px solid rgba(137, 198, 248, 0.35)',
            color: '#93c5fd',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: 28,
          }}
        >
          <span>07:{String(minute).padStart(2, '0')} WIB</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: minsLeft <= 5 ? '#fca5a5' : undefined }}>{minsLeft} MENIT LAGI RAPAT PIMPINAN</span>
        </div>

        <h1
          style={{
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            color: '#f8fafc',
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Banyak Proyek. Banyak Laporan.
          <br />
          <span style={{ color: '#38bdf8' }}>Satu Pertanyaan Penting.</span>
        </h1>
      </div>
      </div>

      {/* Unified Glowing PMO Logo on Convergence */}
      <div
        style={{
          position: 'absolute',
          zIndex: 8,
          opacity: hubOpacity,
          textAlign: 'center',
        }}
      >
        <Img
          src={staticFile('media/brand/logo.png')}
          style={{
            width: 300,
            height: 'auto',
            filter: `drop-shadow(0 0 ${Math.round(32 + 28 * glowPulse)}px rgba(56, 189, 248, ${0.65 + 0.3 * glowPulse}))`,
          }}
        />
      </div>
    </div>
  );
};
