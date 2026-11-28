import React from 'react';
import { Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { ExecutiveBackdrop } from '../components/Device3DFrame';

type Visual3DCctvSceneProps = {
  externalCctvFile?: string;
};

export const Visual3DCctvScene: React.FC<Visual3DCctvSceneProps> = ({
  externalCctvFile,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const tilt = interpolate(frame, [0, 24], [-8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ExecutiveBackdrop />

      <div style={{ position: 'absolute', top: 28, left: 72, right: 72, zIndex: 10 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 999,
            background: 'rgba(45, 212, 191, 0.14)',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            color: '#5eead4',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Visual Verification
        </div>
        <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Galeri Dokumentasi Lapangan &amp; Model 3D Interaktif
        </div>
        <div style={{ color: '#94a3b8', fontSize: 18, marginTop: 3 }}>
          Verifikasi progres fisik konstruksi langsung dari browser (siap integrasi CCTV)
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 165,
          left: 72,
          right: 72,
          bottom: 36,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 28,
          perspective: '1800px',
        }}
      >
        {/* Left: External CCTV Video (if provided) OR Open Gallery Photos */}
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            background: '#0b1726',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            transform: `rotateY(${-tilt}deg)`,
          }}
        >
          <div style={{ padding: '10px 18px', background: '#112236', borderBottom: '1px solid rgba(148,163,184,0.16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>
              {externalCctvFile ? 'Live View CCTV Lapangan' : 'Galeri Foto Lapangan'}
            </span>
            <span style={{ color: '#4ade80', fontSize: 12.5, fontWeight: 700 }}>
              {externalCctvFile ? '● LIVE FEED' : 'DOKUMENTASI PROYEK'}
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#07111d' }}>
            <Video
              src={staticFile(externalCctvFile || 'clips/clip4b-gallery.webm')}
              muted
              trimBefore={externalCctvFile ? 0 : 2 * fps}
              objectFit="contain"
            style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Right: 3D Model */}
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            background: '#0b1726',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            transform: `rotateY(${tilt}deg)`,
          }}
        >
          <div style={{ padding: '10px 18px', background: '#112236', borderBottom: '1px solid rgba(148,163,184,0.16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>Model 3D Proyek</span>
            <span style={{ color: '#38bdf8', fontSize: 12.5, fontWeight: 700 }}>INTERACTIVE 3D</span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#07111d' }}>
            <Video
              src={staticFile('clips/clip4-visual-3d.webm')}
              muted
              trimBefore={1.5 * fps}
              objectFit="contain"
            style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
