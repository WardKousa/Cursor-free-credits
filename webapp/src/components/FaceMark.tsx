import { useEffect, useRef, useState } from "react";

/**
 * FaceMark — the app's brand mark / avatar.
 *
 * Renders the point-cloud face logo from `public/face.png`. If that image is
 * missing it falls back to a procedurally drawn point-cloud face so the mark
 * always shows something on-brand.
 */
export default function FaceMark({ size = 32 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hasImage, setHasImage] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasImage(true);
    img.onerror = () => setHasImage(false);
    img.src = "/face.png";
  }, []);

  useEffect(() => {
    if (hasImage !== false) return; // only draw the fallback when the image is absent
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const N = 26;
    ctx.clearRect(0, 0, size, size);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const v = j / (N - 1);
        const x = (u - 0.5) * 2;
        const y = (v - 0.5) * 2;
        const head = Math.exp(-((x * 1.2) ** 2 + (y * 0.95) ** 2) * 1.8);
        const nose = Math.exp(-(((x - 0.16) * 6) ** 2 + (y * 1.1) ** 2)) * 0.5;
        const d = Math.min(1, head + nose);
        if (d < 0.18) continue;
        const br = Math.min(1, 0.3 + d);
        ctx.fillStyle = `rgba(${Math.round(47 + br * 208)},${Math.round(125 + br * 13)},${Math.round(255 - br * 194)},${0.4 + br * 0.6})`;
        ctx.fillRect(u * size, v * size, 1.3, 1.3);
      }
    }
  }, [size, hasImage]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "radial-gradient(circle at 30% 30%, rgba(255,138,61,0.22), rgba(10,10,12,0.92))",
        border: "1px solid var(--border-strong)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {hasImage ? (
        <img
          src="/face.png"
          alt="mooizicht"
          style={{ width: size, height: size, objectFit: "cover", display: "block" }}
        />
      ) : (
        <canvas ref={ref} style={{ width: size, height: size }} />
      )}
    </div>
  );
}
