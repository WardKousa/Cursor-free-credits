import { useState } from "react";
import { companies, statusColors } from "../lib/data";

// NL bounding box (approx)
const BOUNDS = { minLng: 3.3, maxLng: 7.25, minLat: 50.7, maxLat: 53.6 };
const W = 520;
const H = 300;

const project = (lng: number, lat: number) => {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W;
  const y = H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H;
  return { x, y };
};

export default function NLScatter() {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <radialGradient id="mapglow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(255,138,61,0.09)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="14" fill="rgba(255,255,255,0.015)" />
        <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#mapglow)" />

        {/* graticule */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={"v" + i} x1={(i * W) / 8} y1={0} x2={(i * W) / 8} y2={H} stroke="rgba(255,255,255,0.04)" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={"h" + i} x1={0} y1={(i * H) / 5} x2={W} y2={(i * H) / 5} stroke="rgba(255,255,255,0.04)" />
        ))}

        {/* connection lines to a notional HQ (Amsterdam) */}
        {companies.map((c) => {
          const p = project(c.lng, c.lat);
          const hq = project(4.9041, 52.3676);
          return <line key={"l" + c.id} x1={hq.x} y1={hq.y} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" />;
        })}

        {/* company dots */}
        {companies.map((c) => {
          const p = project(c.lng, c.lat);
          const col = statusColors[c.status];
          const active = hover === c.id;
          const r = 4 + (c.score - 60) / 12;
          return (
            <g key={c.id} onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={active ? r + 8 : r + 4} fill={col} opacity={active ? 0.25 : 0.14} />
              <circle cx={p.x} cy={p.y} r={r} fill={col} />
              <circle cx={p.x} cy={p.y} r={r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={active ? 1.2 : 0} />
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: project(companies.find((c) => c.id === hover)!.lng, companies.find((c) => c.id === hover)!.lat).x / W * 100 + "%",
            top: project(companies.find((c) => c.id === hover)!.lng, companies.find((c) => c.id === hover)!.lat).y / H * 100 + "%",
            transform: "translate(-50%, -130%)",
            background: "rgba(14,14,21,0.96)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            padding: "8px 11px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          {(() => {
            const c = companies.find((x) => x.id === hover)!;
            return (
              <>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ color: "var(--text-faint)", marginTop: 2 }}>
                  {c.industry} · {c.city} · {c.status}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
