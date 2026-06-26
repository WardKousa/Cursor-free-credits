import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, RefreshCw, Sheet, Link2, Check, AlertCircle, Radio } from "lucide-react";
import { Card, SectionTitle } from "../components/ui";
import { useStore } from "../lib/store";
import { Company } from "../lib/data";

type Table = { headers: string[]; rows: string[][] };

// minimal RFC-4180-ish CSV parse (handles quoted fields + embedded commas)
function parseCSV(text: string): Table {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return { headers: clean[0] || [], rows: clean.slice(1) };
}

function companiesToTable(cs: Company[]): Table {
  return {
    headers: ["name", "industry", "city", "employees", "status", "score"],
    rows: cs.map((c) => [c.name, c.industry, c.city, String(c.employees), c.status, String(c.score)]),
  };
}

function ago(t: number | null) {
  if (!t) return "—";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

export default function DataCSV() {
  const { companies, sheet, saveSheet, syncNow, sheetState, lastSync, sheetRows, sheetError, sheetTable } = useStore();
  const [localTable, setLocalTable] = useState<Table | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // prefer an uploaded CSV, then the live CRM sheet, then the seeded companies
  const liveSheet = sheetTable && sheetTable.headers.length ? sheetTable : null;
  const table = localTable || liveSheet || companiesToTable(companies);
  const source = localTable ? "Uploaded CSV" : liveSheet ? "CRM · Google Sheet (live)" : "Enriched companies";

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setLocalTable(parseCSV(String(reader.result)));
    reader.readAsText(file);
  };

  const download = () => {
    const csv = [table.headers, ...table.rows].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "mooizicht-companies.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const live = sheet.autoSync && sheet.url && sheet.apiKey;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            Data
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Lead sources</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-faint)", fontSize: 14 }}>
            Connect a Google Sheet once — it syncs automatically. Agents enrich every row.
          </p>
        </div>
        <button onClick={download} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", fontSize: 13.5, fontWeight: 500 }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        {/* Google Sheets connect — auto-syncing */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(79,208,106,0.14)", border: "1px solid var(--border)" }}>
              <Sheet size={17} color="var(--green)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Google Sheets</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Auto-syncs via the Sheets API v4 every 30s</div>
            </div>
            {live && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: sheetState === "error" ? "var(--bad)" : "var(--good)", fontWeight: 500 }}>
                <Radio size={13} className={sheetState === "syncing" ? "" : ""} style={sheetState === "syncing" ? { animation: "spin 1s linear infinite" } : undefined} />
                {sheetState === "syncing" ? "Syncing…" : sheetState === "error" ? "Error" : "Live"}
              </span>
            )}
          </div>

          <Field icon={<Link2 size={14} />}>
            <input value={sheet.url} onChange={(e) => saveSheet({ url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/…" style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Field>
              <input value={sheet.range} onChange={(e) => saveSheet({ range: e.target.value })} placeholder="Sheet1!A1:Z1000" style={inputStyle} />
            </Field>
            <Field>
              <input value={sheet.apiKey} onChange={(e) => saveSheet({ apiKey: e.target.value })} placeholder="Google API key" type="password" style={{ ...inputStyle, fontFamily: "var(--mono)" }} />
            </Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)", cursor: "pointer" }}>
              <input type="checkbox" checked={sheet.autoSync} onChange={(e) => saveSheet({ autoSync: e.target.checked })} style={{ accentColor: "var(--green)" }} />
              Auto-sync
            </label>
            <button onClick={syncNow} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", fontSize: 13 }}>
              <RefreshCw size={14} style={sheetState === "syncing" ? { animation: "spin 1s linear infinite" } : undefined} /> Sync now
            </button>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)" }}>
              {sheetState === "ok" ? `${sheetRows} rows · ${ago(lastSync)}` : sheetState === "syncing" ? "fetching…" : "not synced"}
            </span>
          </div>

          {sheetError && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "var(--bad)" }}>
              <AlertCircle size={14} /> {sheetError}
            </div>
          )}
          {sheetState === "ok" && !sheetError && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "var(--good)" }}>
              <Check size={14} /> Synced — companies with lat/lng update the map live.
            </div>
          )}
          <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 14, lineHeight: 1.6 }}>
            Share the sheet as <strong style={{ color: "var(--text-dim)" }}>Anyone with the link</strong>, enable the Google Sheets API
            for your key, and include <code style={{ fontFamily: "var(--mono)" }}>name, lat, lng, status</code> columns to feed the map.
          </p>
        </Card>

        {/* CSV drop */}
        <Card pad={0} style={{ border: drag ? "1.5px dashed var(--accent)" : "1.5px dashed var(--border-strong)", background: drag ? "var(--grad-soft)" : "var(--panel)", transition: "all .15s ease" }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            style={{ height: "100%", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", cursor: "pointer" }}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            <div style={{ width: 46, height: 46, borderRadius: 13, marginBottom: 12, display: "grid", placeItems: "center", background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
              <Upload size={20} color="var(--accent)" />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 500 }}>Or drop a CSV</div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 4 }}>{localTable ? `${localTable.rows.length} rows loaded` : "One-off import"}</div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card pad={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <FileSpreadsheet size={15} color="var(--accent-2)" />
          <SectionTitle title={source} sub={`${table.rows.length} rows`} />
          {localTable && (
            <button onClick={() => setLocalTable(null)} style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)", background: "none", border: "none" }}>
              show synced data
            </button>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "12px 18px", color: "var(--text-faint)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.slice(0, 60).map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j} style={{ padding: "11px 18px", borderBottom: "1px solid var(--border)", color: j === 0 ? "var(--text)" : "var(--text-dim)", fontWeight: j === 0 ? 500 : 400, whiteSpace: "nowrap" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, width: "100%" };

function Field({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
      {icon && <span style={{ color: "var(--text-faint)", display: "flex" }}>{icon}</span>}
      {children}
    </div>
  );
}
