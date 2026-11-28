import React from 'react';
import { Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { ExecutiveBackdrop } from '../components/Device3DFrame';

export const MobileSplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Right phone slides in smoothly right after clicking Executive menu (~2.2s)
  const rightEnterStart = Math.round(fps * 2.0);
  const rightProgress = interpolate(
    frame,
    [rightEnterStart, rightEnterStart + Math.round(fps * 0.9)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }
  );

  const leftShiftX = interpolate(rightProgress, [0, 1], [0, -235]);
  const rightShiftX = interpolate(rightProgress, [0, 1], [320, 235]);

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ExecutiveBackdrop />
      <div style={{ position: 'absolute', inset: 0, opacity }}>

      {/* Top Headline */}
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
          Mobile Ready • Side-by-Side
        </div>
        <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Dari Portal Mobile Langsung ke Executive Monthly
        </div>
        <div style={{ color: '#94a3b8', fontSize: 18, marginTop: 3 }}>
          Akses cepat lintas perangkat tanpa perlu membuka laptop
        </div>
      </div>

      {/* Dual Phone Stage */}
      <div
        style={{
          position: 'absolute',
          top: 155,
          left: 0,
          right: 0,
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1800px',
        }}
      >
        {/* Left Phone: Portal Mobile */}
        <div
          style={{
            position: 'absolute',
            width: 392,
            height: 850,
            borderRadius: 38,
            background: '#0b1726',
            border: '10px solid #1e293b',
            boxShadow: '0 36px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            transform: `translateX(${leftShiftX}px) rotateY(${interpolate(rightProgress, [0, 1], [0, 6])}deg)`,
          }}
        >
          <Video
            src={staticFile('clips/clip6a-mobile-portal.webm')}
            muted
            playbackRate={1.1}
            trimBefore={1 * fps}
            objectFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Right Phone: Executive Monthly Mobile */}
        <div
          style={{
            position: 'absolute',
            width: 392,
            height: 850,
            borderRadius: 38,
            background: '#0b1726',
            border: '10px solid #0284c7',
            boxShadow: '0 36px 90px rgba(2, 132, 199, 0.35)',
            overflow: 'hidden',
            opacity: rightProgress,
            transform: `translateX(${rightShiftX}px) rotateY(-6deg)`,
          }}
        >
          <Video
            src={staticFile('clips/clip6b-mobile-exec.webm')}
            muted
            playbackRate={1.1}
            trimBefore={2 * fps}
            objectFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      </div>
    </div>
  );
};
