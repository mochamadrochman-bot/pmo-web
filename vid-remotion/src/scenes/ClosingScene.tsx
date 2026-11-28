import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { ExecutiveBackdrop } from '../components/Device3DFrame';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const videoFadeOut = interpolate(
    frame,
    [fps * 7.2, fps * 8.2],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const logoFadeIn = interpolate(
    frame,
    [fps * 7.4, fps * 8.4],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }
  );

  const logoScale = interpolate(
    frame,
    [fps * 7.4, fps * 8.6],
    [0.86, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }
  );

  const glowPulse = 0.65 + 0.35 * Math.sin(frame / 10);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <ExecutiveBackdrop />

      {/* Phase 1: Video Sena Spotlight sebagai penutup */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 72,
          opacity: videoFadeOut,
        }}
      >
        <div
          style={{
            width: 1472,
            height: 828,
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.7)',
            background: '#06101c',
          }}
        >
          <Video
            src={staticFile('media/sena-closing.mp4')}
            objectFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Phase 2: Glowing ("Berpendar") Official PMO Logo & Tagline */}
      <div
        style={{
          position: 'relative',
          zIndex: 4,
          textAlign: 'center',
          opacity: logoFadeIn,
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={staticFile('media/brand/logo.png')}
          style={{
            width: 340,
            height: 'auto',
            marginBottom: 26,
            filter: `drop-shadow(0 0 ${Math.round(34 + 30 * glowPulse)}px rgba(56, 189, 248, ${0.65 + 0.3 * glowPulse}))`,
          }}
        />
        <div
          style={{
            color: '#f8fafc',
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textShadow: '0 6px 30px rgba(56, 189, 248, 0.25)',
          }}
        >
          Kendali Penuh di Setiap Progres Proyek
        </div>
        <div style={{ color: '#5eead4', fontSize: 26, fontWeight: 700, marginTop: 18, letterSpacing: '0.02em' }}>
          pmopetrokimia.tech
        </div>
      </div>
    </div>
  );
};
