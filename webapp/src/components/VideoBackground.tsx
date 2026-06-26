import { useEffect, useRef } from "react";

/**
 * Fixed, full-viewport looping video background — replaces the Three.js
 * particle field (which was too heavy on the CPU/GPU). Sits behind everything
 * (z-index 0) with a slight translucent scrim on top so UI text stays legible;
 * the scrim is intentionally lighter than the chrome blocks. Honors
 * prefers-reduced-motion by holding on the first frame instead of playing.
 */
export default function VideoBackground() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { v.pause(); return; }
    // Some browsers don't honor the autoplay attribute until an explicit play().
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <div aria-hidden className="video-bg">
      <video ref={ref} src="/recording.mp4" autoPlay loop muted playsInline preload="auto" />
      <div className="video-bg__scrim" />
    </div>
  );
}
