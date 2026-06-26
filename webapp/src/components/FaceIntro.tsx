import { useEffect, useRef, useState } from "react";

/**
 * FaceIntro — the entry sequence for mooizicht.
 *
 * Plays the Seedance point-cloud face video (`public/intro.mp4`) full-screen,
 * then hands off into the app. The render fades to near-black (#06060A) on its
 * final frame so the cut into the dashboard is seamless.
 *
 * Behaviour:
 *   - autoplays muted (so browsers allow it), inline, no controls
 *   - click / Enter / Space / Esc skips straight to the app
 *   - when the video ends it fades out and calls onDone()
 *   - if the video is missing or fails to load, it fails open: a short
 *     fallback delay then onDone(), so the app never gets stuck on a blank screen
 */

const FADE_MS = 600;
const FALLBACK_MS = 1200; // used only if the video can't play

export default function FaceIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setLeaving(true);
      window.setTimeout(onDone, FADE_MS);
    };

    const video = videoRef.current;
    let fallback = 0;

    if (video) {
      video.play().catch(() => {
        // Autoplay blocked or no source — fail open after a short beat.
        fallback = window.setTimeout(finish, FALLBACK_MS);
      });
    } else {
      fallback = window.setTimeout(finish, FALLBACK_MS);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    const hintTimer = window.setTimeout(() => setHint(false), 4200);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hintTimer);
      window.clearTimeout(fallback);
    };
  }, [onDone]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  };

  return (
    <div
      onClick={finish}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#06060a",
        overflow: "hidden",
        cursor: "pointer",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={() => window.setTimeout(finish, FALLBACK_MS)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* subtle edge vignette so the wordmark stays legible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(6,6,10,0.55) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "11%",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          className="gradient-text"
          style={{
            fontFamily: "var(--mono)",
            letterSpacing: "0.5em",
            fontSize: 13,
            textTransform: "uppercase",
            opacity: 0.9,
            animation: "fadeUp 1.2s ease both",
          }}
        >
          mooizicht
        </div>
        {hint && (
          <div
            style={{
              marginTop: 14,
              color: "var(--text-faint)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            click to skip
          </div>
        )}
      </div>
    </div>
  );
}
