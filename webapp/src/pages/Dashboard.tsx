import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { Bell, ChevronRight, Database } from "lucide-react";
import { Card, SectionTitle, Badge } from "../components/ui";
import { statusColors, Company } from "../lib/data";
import { useStore } from "../lib/store";

const tooltipStyle = { background: "rgba(14,14,21,0.95)", border: "1px solid var(--border-strong)", borderRadius: 12, fontSize: 12, color: "#f6f5f3" };
const tipText = { color: "#f6f5f3" };
const PALETTE = ["#2f7dff", "#4fd06a", "#efd29a", "#ff8a3d", "#ff2d9b", "#7c5cff", "#37c4d6"];

/** Everything on this page is derived from the live CRM companies (the synced
 *  Google Sheet / CSV) — no mock numbers. */
function derive(companies: Company[]) {
  const total = companies.length;
  const by = (s: Company["status"]) => companies.filter((c) => c.status === s).length;
  const counts = { researching: by("researching"), queued: by("queued"), contacted: by("contacted"), replied: by("replied"), won: by("won") };
  const reachedOut = counts.contacted + counts.replied + counts.won;
  const responded = counts.replied + counts.won;
  const replyRate = reachedOut ? (responded / reachedOut) * 100 : 0;
  const avgScore = total ? Math.round(companies.reduce((s, c) => s + (c.score || 0), 0) / total) : 0;

  const pipeline = [
    { stage: "Researching", value: counts.researching, fill: statusColors.researching },
    { stage: "Queued", value: counts.queued, fill: statusColors.queued },
    { stage: "Contacted", value: counts.contacted, fill: statusColors.contacted },
    { stage: "Replied", value: counts.replied, fill: statusColors.replied },
    { stage: "Won", value: counts.won, fill: statusColors.won },
  ];

  const responses = [
    { name: "Responded", value: responded, fill: "#4fd06a" },
    { name: "Contacted, no reply", value: counts.contacted, fill: "#ff8a3d" },
    { name: "Not yet contacted", value: counts.researching + counts.queued, fill: "#2f7dff" },
  ].filter((r) => r.value > 0);

  const indCounts: Record<string, number> = {};
  companies.forEach((c) => { const k = c.industry || "—"; indCounts[k] = (indCounts[k] || 0) + 1; });
  const indSorted = Object.entries(indCounts).sort((a, b) => b[1] - a[1]);
  const industryMix = indSorted.slice(0, 6).map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }));
  const otherSum = indSorted.slice(6).reduce((s, [, v]) => s + v, 0);
  if (otherSum) industryMix.push({ name: "Other", value: otherSum, fill: "#37414f" });

  const icp = [
    { name: "0–39", value: companies.filter((c) => c.score < 40).length, fill: "#ff4d6d" },
    { name: "40–59", value: companies.filter((c) => c.score >= 40 && c.score < 60).length, fill: "#efc25a" },
    { name: "60–79", value: companies.filter((c) => c.score >= 60 && c.score < 80).length, fill: "#2f7dff" },
    { name: "80–100", value: companies.filter((c) => c.score >= 80).length, fill: "#4fd06a" },
  ];

  const kpis = [
    { label: "Companies in CRM", value: total.toLocaleString(), sub: `${counts.researching + counts.queued} not yet contacted` },
    { label: "Reached out", value: reachedOut.toLocaleString(), sub: total ? `${Math.round((reachedOut / total) * 100)}% of pipeline` : "—" },
    { label: "Reply rate", value: replyRate.toFixed(1) + "%", sub: `${responded} responded` },
    { label: "Meetings booked", value: counts.won.toLocaleString(), sub: `avg ICP ${avgScore}` },
  ];

  return { total, replyRate, pipeline, responses, industryMix, icp, kpis };
}

export default function Dashboard({ onOpenInbox }: { onOpenInbox: () => void }) {
  const { companies, openCount, sheetState, lastSync } = useStore();
  const a = useMemo(() => derive(companies), [companies]);

  const recent = companies.filter((c) => c.status === "replied" || c.status === "won").slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            Overview
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Who we contacted, and who's responding
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-faint)" }}>
          <Database size={13} color={sheetState === "ok" ? "var(--good)" : "var(--text-faint)"} />
          {a.total} companies · {sheetState === "ok" ? "live CRM" : sheetState === "syncing" ? "syncing…" : "CRM"}
          {lastSync ? ` · ${new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
        </div>
      </div>

      {openCount > 0 && (
        <button
          onClick={onOpenInbox}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel-strong)", color: "var(--text)", textAlign: "left" }}
        >
          <Bell size={17} color="var(--accent)" />
          <span style={{ fontSize: 13.5 }}>
            <strong>{openCount} agent {openCount === 1 ? "request" : "requests"}</strong> need your decision — emailed to you automatically.
          </span>
          <ChevronRight size={16} style={{ marginLeft: "auto" }} color="var(--text-faint)" />
        </button>
      )}

      {/* KPI row — derived from the CRM */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {a.kpis.map((k) => (
          <Card key={k.label} pad={18}>
            <div style={{ color: "var(--text-faint)", fontSize: 12.5 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Pipeline by stage + response donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle title="Pipeline by stage" sub="Every company by where it is in outreach" />
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={a.pipeline} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="stage" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={46}>
                {a.pipeline.map((d) => <Cell key={d.stage} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle title="Have they responded?" sub={`${a.replyRate.toFixed(1)}% reply rate of those contacted`} />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={a.responses} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="none">
                {a.responses.map((r) => <Cell key={r.name} fill={r.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
            {a.responses.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: r.fill }} />
                <span style={{ color: "var(--text-dim)", flex: 1 }}>{r.name}</span>
                <span style={{ fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ICP fit distribution + industry mix */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle title="ICP fit distribution" sub="Companies bucketed by fit score (0–100)" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.icp} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={46}>
                {a.icp.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle title="What they do" sub="Industry mix of CRM companies" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.industryMix} layout="vertical" margin={{ left: 18, right: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} width={96} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {a.industryMix.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Latest responses */}
      <Card>
        <SectionTitle title="Latest responses" sub="Companies that replied or booked a meeting" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recent.length === 0 ? (
            <div style={{ padding: "16px 4px", color: "var(--text-faint)", fontSize: 13 }}>No replies yet — agents are still working the pipeline.</div>
          ) : recent.map((c, i) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px 130px", gap: 16, alignItems: "center", padding: "12px 4px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13.5 }}>
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div style={{ color: "var(--text-dim)", textAlign: "right" }}>{c.industry}</div>
              <div style={{ color: "var(--text-dim)", textAlign: "right" }}>{c.employees ? `${c.employees.toLocaleString()} emp` : "—"}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Badge color={statusColors[c.status]}>{c.status === "won" ? "meeting booked" : "replied"}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
