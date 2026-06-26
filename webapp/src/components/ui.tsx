import { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
  pad = 20,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: pad,
        backdropFilter: "blur(12px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h2>
      {sub && <p style={{ margin: "4px 0 0", color: "var(--text-faint)", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  // Just a colored dot + label — no pill background or border.
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        fontWeight: 500,
        color,
        textTransform: "capitalize",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {children}
    </span>
  );
}

export function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--text)" : "var(--text-dim)",
        background: active ? "var(--panel-strong)" : "transparent",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        transition: "all .18s ease",
      }}
    >
      {children}
    </button>
  );
}
