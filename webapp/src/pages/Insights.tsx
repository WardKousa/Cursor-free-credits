import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PieChart as PieIcon, BarChart3, LineChart as LineIcon, Donut, Plus, Trash2, Save } from "lucide-react";
import { Card, SectionTitle } from "../components/ui";
import { useStore } from "../lib/store";
import { Company, statusLabel, STATUS_ORDER } from "../lib/data";

const PALETTE = ["#2f7dff", "#4fd06a", "#efd29a", "#ff8a3d", "#ff2d9b", "#7c5cff", "#37c4d6"];

type ChartType = "bar" | "pie" | "donut" | "line";
type Measure = "count" | "avgScore" | "sumEmployees";
type GroupBy = "industry" | "status" | "city" | "empBand";

type Config = {
  type: ChartType;
  measure: Measure;
  groupBy: GroupBy;
  industry: string; // "all" or specific
  status: string; // "all" or specific
  empMin: number;
  empMax: number;
  title: string;
};

const empBand = (n: number) => (n <= 50 ? "1–50" : n <= 200 ? "51–200" : n <= 500 ? "201–500" : "500+");

const measureLabel: Record<Measure, string> = { count: "Number of companies", avgScore: "Avg fit score", sumEmployees: "Total employees" };
const groupLabel: Record<GroupBy, string> = { industry: "Industry", status: "Response status", city: "City", empBand: "Employee band" };

function aggregate(companies: Company[], cfg: Config) {
  const rows = companies.filter(
    (c) =>
      (cfg.industry === "all" || c.industry === cfg.industry) &&
      (cfg.status === "all" || c.status === cfg.status) &&
      c.employees >= cfg.empMin &&
      c.employees <= cfg.empMax
  );
  const key = (c: Company) =>
    cfg.groupBy === "empBand" ? empBand(c.employees) : cfg.groupBy === "status" ? statusLabel(c.status) : (c[cfg.groupBy] as string);
  const groups: Record<string, Company[]> = {};
  rows.forEach((c) => {
    const k = key(c) || "—";
    (groups[k] ||= []).push(c);
  });
  return Object.entries(groups)
    .map(([name, cs], i) => {
      let value = cs.length;
      if (cfg.measure === "avgScore") value = Math.round(cs.reduce((s, c) => s + c.score, 0) / cs.length);
      if (cfg.measure === "sumEmployees") value = cs.reduce((s, c) => s + c.employees, 0);
      return { name, value, fill: PALETTE[i % PALETTE.length] };
    })
    .sort((a, b) => b.value - a.value);
}

const tooltipStyle = { background: "rgba(14,14,21,0.95)", border: "1px solid var(--border-strong)", borderRadius: 12, fontSize: 12, color: "#f6f5f3" };
// recharts colors the label/items separately from the container — force white
const tipText = { color: "#f6f5f3" };

function ChartView({ data, type }: { data: { name: string; value: number; fill: string }[]; type: ChartType }) {
  if (!data.length) return <Empty />;
  if (type === "pie" || type === "donut") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={type === "donut" ? 62 : 0} outerRadius={92} paddingAngle={type === "donut" ? 3 : 1} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: -16, right: 10, top: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Line type="monotone" dataKey="value" stroke="#2f7dff" strokeWidth={2.5} dot={{ r: 3, fill: "#2f7dff" }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 10, top: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={34}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const Empty = () => (
  <div style={{ height: 260, display: "grid", placeItems: "center", color: "var(--text-faint)", fontSize: 13 }}>No companies match these filters.</div>
);

export default function Insights() {
  const { companies } = useStore();
  const industries = useMemo(() => ["all", ...Array.from(new Set(companies.map((c) => c.industry)))], [companies]);
  const statuses = ["all", ...STATUS_ORDER];

  const [cfg, setCfg] = useState<Config>({
    type: "donut",
    measure: "count",
    groupBy: "status",
    industry: "all",
    status: "all",
    empMin: 0,
    empMax: 1000,
    title: "Companies by response status",
  });
  const [saved, setSaved] = useState<Config[]>([]);

  const set = (p: Partial<Config>) => setCfg((c) => ({ ...c, ...p }));
  const data = useMemo(() => aggregate(companies, cfg), [companies, cfg]);

  const types: { id: ChartType; icon: typeof PieIcon; label: string }[] = [
    { id: "bar", icon: BarChart3, label: "Bar" },
    { id: "pie", icon: PieIcon, label: "Pie" },
    { id: "donut", icon: Donut, label: "Donut" },
    { id: "line", icon: LineIcon, label: "Line" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
          Insights
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Build any report you want</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        {/* Builder controls */}
        <Card>
          <SectionTitle title="Configure" />
          <Group label="Chart type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {types.map((t) => {
                const Icon = t.icon;
                const active = cfg.type === t.id;
                return (
                  <button key={t.id} onClick={() => set({ type: t.id })} style={seg(active)}>
                    <Icon size={15} /> {t.label}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group label="Measure">
            <Select value={cfg.measure} onChange={(v) => set({ measure: v as Measure })} options={Object.entries(measureLabel).map(([v, l]) => ({ v, l }))} />
          </Group>
          <Group label="Group by">
            <Select value={cfg.groupBy} onChange={(v) => set({ groupBy: v as GroupBy })} options={Object.entries(groupLabel).map(([v, l]) => ({ v, l }))} />
          </Group>

          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
          <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Filters</div>

          <Group label="Industry">
            <Select value={cfg.industry} onChange={(v) => set({ industry: v })} options={industries.map((i) => ({ v: i, l: i === "all" ? "All industries" : i }))} />
          </Group>
          <Group label="Status">
            <Select value={cfg.status} onChange={(v) => set({ status: v })} options={statuses.map((s) => ({ v: s, l: s === "all" ? "All statuses" : statusLabel(s as any) }))} />
          </Group>
          <Group label={`Employees: ${cfg.empMin} – ${cfg.empMax}`}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" value={cfg.empMin} onChange={(e) => set({ empMin: +e.target.value })} style={numStyle} />
              <input type="number" value={cfg.empMax} onChange={(e) => set({ empMax: +e.target.value })} style={numStyle} />
            </div>
          </Group>
        </Card>

        {/* Live preview */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <input
              value={cfg.title}
              onChange={(e) => set({ title: e.target.value })}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}
            />
            <button onClick={() => setSaved((s) => [...s, cfg])} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--grad-soft)", color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
              <Plus size={14} /> Save to dashboard
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 10 }}>
            {measureLabel[cfg.measure]} by {groupLabel[cfg.groupBy].toLowerCase()}
            {cfg.industry !== "all" && ` · ${cfg.industry}`}
            {cfg.status !== "all" && ` · ${cfg.status}`}
            {` · ${cfg.empMin}-${cfg.empMax} emp`}
          </div>
          <ChartView data={data} type={cfg.type} />
        </Card>
      </div>

      {/* Saved charts */}
      {saved.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 12px" }}>
            <Save size={15} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Saved charts</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {saved.map((s, i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{s.title}</span>
                  <button onClick={() => setSaved((arr) => arr.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text-faint)" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <ChartView data={aggregate(companies, s)} type={s.type} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const seg = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px",
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 500,
  border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
  background: active ? "var(--panel-strong)" : "transparent",
  color: active ? "var(--text)" : "var(--text-dim)",
});

const numStyle: React.CSSProperties = { flex: 1, width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 13, outline: "none" };

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 13, outline: "none", textTransform: "capitalize" }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v} style={{ background: "#14141d", color: "#f6f5f3" }}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
