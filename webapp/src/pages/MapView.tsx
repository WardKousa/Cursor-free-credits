import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Card, SectionTitle, Badge } from "../components/ui";
import { statusColors, Company } from "../lib/data";
import CompanyMap, { MAPBOX_TOKEN_KEY, getMapboxToken } from "../components/CompanyMap";
import { useStore } from "../lib/store";

export default function MapView() {
  const { companies } = useStore();
  const [token, setToken] = useState<string>(getMapboxToken());
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);

  const saveToken = () => {
    if (!input.trim()) return;
    localStorage.setItem(MAPBOX_TOKEN_KEY, input.trim());
    setToken(input.trim());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
          Map
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Target map</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-faint)", fontSize: 14 }}>
          Every company our agents are working, by location and response status.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <Card pad={token ? 0 : 22} style={{ overflow: "hidden", minHeight: 520 }}>
          {!token && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 14, borderRadius: 12, border: "1px dashed var(--border-strong)", background: "var(--grad-soft)", marginBottom: 16 }}>
              <KeyRound size={18} color="var(--accent)" />
              <div style={{ flex: 1, fontSize: 13, color: "var(--text-dim)" }}>Add a Mapbox token for the live dark map.</div>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="pk.eyJ…" style={{ width: 180, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--mono)" }} />
              <button onClick={saveToken} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#1a0e06", fontWeight: 600, fontSize: 13 }}>Save</button>
            </div>
          )}
          <CompanyMap companies={companies} height={520} onSelect={setSelected} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <SectionTitle title={selected ? selected.name : "Select a company"} sub={selected ? `${selected.industry} · ${selected.city}` : "Click any marker to inspect"} />
            {selected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Badge color={statusColors[selected.status]}>{selected.status}</Badge>
                <Row label="Fit score" value={`${selected.score}/100`} />
                <Row label="Employees" value={selected.employees.toLocaleString()} />
                <Row label="Coordinates" value={`${selected.lat.toFixed(3)}, ${selected.lng.toFixed(3)}`} />
                <button style={{ marginTop: 6, padding: "10px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--grad-soft)", color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
                  Assign agent to research
                </button>
              </div>
            ) : (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Agents pull each company's location automatically during enrichment.</p>
            )}
          </Card>

          <Card>
            <SectionTitle title="By status" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(statusColors).map(([k, c]) => {
                const n = companies.filter((x) => x.status === k).length;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: c }} />
                    <span style={{ flex: 1, textTransform: "capitalize", color: "var(--text-dim)" }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-faint)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
