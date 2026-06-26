import { useState } from "react";
import { Search } from "lucide-react";
import { Card, Badge, Pill } from "../components/ui";
import { statusColors, Company } from "../lib/data";
import { useStore } from "../lib/store";

const STATUSES: (Company["status"] | "all")[] = ["all", "researching", "queued", "contacted", "replied", "won"];

export default function Companies() {
  const { companies } = useStore();
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const rows = companies.filter(
    (c) => (filter === "all" || c.status === filter) && (c.name + c.industry + c.city).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
          Pipeline
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Companies</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--panel)", flex: 1, maxWidth: 320 }}>
          <Search size={15} color="var(--text-faint)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13.5 }}
          />
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s}
            </Pill>
          ))}
        </div>
      </div>

      <Card pad={0}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 1fr 1.1fr",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            fontSize: 11.5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-faint)",
          }}
        >
          <div>Company</div>
          <div>Industry</div>
          <div>City</div>
          <div>Size</div>
          <div>Fit</div>
          <div>Status</div>
        </div>
        {rows.map((c) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 1fr 1.1fr",
              gap: 12,
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13.5,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 500 }}>{c.name}</div>
            <div style={{ color: "var(--text-dim)" }}>{c.industry}</div>
            <div style={{ color: "var(--text-dim)" }}>{c.city}</div>
            <div style={{ color: "var(--text-dim)" }}>{c.employees}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", maxWidth: 60 }}>
                <div style={{ width: `${c.score}%`, height: "100%", background: "var(--grad-gemini)" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{c.score}</span>
            </div>
            <div>
              <Badge color={statusColors[c.status]}>{c.status}</Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
