import React from 'react';
import { Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';

type ZoomStep = {
  atSec: number;
  scale: number;
  originX: number;
  originY: number;
};

/** Potongan klip berurutan: lewati layar loading tanpa merekam ulang. `from` = detik di file klip, `dur` = detik di video. */
export type ClipSegment = { from: number; dur: number; rate?: number };

type Device3DFrameProps = {
  clipSrc: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  urlLabel?: string;
  playbackRate?: number;
  startFrom?: number;
  zoomTarget?: { scale: number; origin: string; startSec?: number };
  zoomSteps?: ZoomStep[];
  segments?: ClipSegment[];
  isMobile?: boolean;
};

export const ExecutiveBackdrop: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(circle at 20% 15%, #113557 0%, #07192c 55%, #040d18 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(137, 198, 248, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(137, 198, 248, 0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
};

export const Device3DFrame: React.FC<Device3DFrameProps> = ({
  clipSrc,
  eyebrow,
  title,
  subtitle,
  urlLabel = 'pmopetrokimia.tech',
  playbackRate = 1.0,
  startFrom = 0,
  zoomTarget,
  zoomSteps,
  segments,
  isMobile = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterFrames = Math.min(20, Math.floor(fps * 0.65));
  const exitStart = Math.max(enterFrames + 10, durationInFrames - Math.floor(fps * 0.55));

  const rotY = interpolate(
    frame,
    [0, enterFrames, exitStart, durationInFrames],
    [isMobile ? -16 : -10, 0, 0, isMobile ? 12 : 8],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );

  const rotX = interpolate(
    frame,
    [0, enterFrames, exitStart, durationInFrames],
    [6, 0, 0, -4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );

  const frameScale = interpolate(
    frame,
    [0, enterFrames, exitStart, durationInFrames],
    [0.92, 1, 1, 0.95],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );

  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const zoomStart = fps * (zoomTarget?.startSec ?? 1.8);
  let innerZoom = zoomTarget
    ? interpolate(
        frame,
        [zoomStart, zoomStart + fps * 1.4, durationInFrames - fps * 0.8],
        [1, zoomTarget.scale, zoomTarget.scale],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      )
    : 1;
  let computedOrigin = zoomTarget?.origin || '50% 40%';

  if (zoomSteps && zoomSteps.length >= 2) {
    const times = zoomSteps.map((s) => s.atSec * fps);
    innerZoom = interpolate(
      frame,
      times,
      zoomSteps.map((s) => s.scale),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    const ox = interpolate(
      frame,
      times,
      zoomSteps.map((s) => s.originX),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    const oy = interpolate(
      frame,
      times,
      zoomSteps.map((s) => s.originY),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    computedOrigin = `${ox}% ${oy}%`;
  }

  const badgeOpacity = interpolate(frame, [4, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeY = interpolate(frame, [4, 16], [14, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Exact 16:9 video area (1472 x 828) + 34px topbar = 1472 x 862 so zero dashboard content is cropped
  const boxWidth = isMobile ? 392 : 1472;
  const videoHeight = isMobile ? 850 : 828;
  const topbarHeight = isMobile ? 0 : 34;

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Latar tetap tampil penuh; hanya isi yang memudar, jadi tidak ada kedipan hitam antar-scene */}
      <ExecutiveBackdrop />

      {/* Top Kinetic Callout */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 72,
          right: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: badgeOpacity * opacity,
          transform: `translateY(${badgeY}px)`,
          zIndex: 10,
        }}
      >
        <div>
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
            {eyebrow}
          </div>
          <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ color: '#94a3b8', fontSize: 18, marginTop: 3, fontWeight: 500 }}>{subtitle}</div>
          ) : null}
        </div>
      </div>

      {/* 3D Perspective Container */}
      <div
        style={{
          position: 'absolute',
          top: 158,
          left: 0,
          right: 0,
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1800px',
          opacity,
        }}
      >
        <div
          style={{
            width: boxWidth,
            height: videoHeight + topbarHeight,
            borderRadius: isMobile ? 38 : 18,
            background: '#0b1726',
            border: isMobile ? '10px solid #1e293b' : '1px solid rgba(148, 163, 184, 0.28)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: `scale(${frameScale}) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {!isMobile && (
            <div
              style={{
                height: topbarHeight,
                background: '#112236',
                borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 7,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              <div
                style={{
                  marginLeft: 12,
                  padding: '2px 12px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#94a3b8',
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                {urlLabel}
              </div>
            </div>
          )}

          <div style={{ width: boxWidth, height: videoHeight, position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
            {segments && segments.length ? (
              (() => {
                let at = 0;
                const xf = 8; // crossfade antar-potongan (frame)
                return segments.map((seg, i) => {
                  const from = Math.round(at * fps);
                  const len = Math.round(seg.dur * fps);
                  at += seg.dur;
                  const first = i === 0;
                  return (
                    <Sequence key={i} from={first ? 0 : from - xf} durationInFrames={len + (first ? 0 : xf)} layout="none">
                      <SegmentVideo
                        src={clipSrc}
                        trim={Math.round(seg.from * fps)}
                        rate={seg.rate ?? playbackRate}
                        fadeIn={first ? 0 : xf}
                        zoom={innerZoom}
                        origin={computedOrigin}
                      />
                    </Sequence>
                  );
                });
              })()
            ) : (
              <Video
                src={staticFile(clipSrc)}
                muted
                playbackRate={playbackRate}
                trimBefore={startFrom}
                objectFit="contain"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scale(${innerZoom})`,
                  transformOrigin: computedOrigin,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SegmentVideo: React.FC<{ src: string; trim: number; rate: number; fadeIn: number; zoom: number; origin: string }> = ({
  src,
  trim,
  rate,
  fadeIn,
  zoom,
  origin,
}) => {
  const f = useCurrentFrame();
  const o = fadeIn ? interpolate(f, [0, fadeIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Video
        src={staticFile(src)}
        muted
        playbackRate={rate}
        trimBefore={trim}
        objectFit="contain"
        style={{ width: '100%', height: '100%', transform: `scale(${zoom})`, transformOrigin: origin }}
      />
    </div>
  );
};
