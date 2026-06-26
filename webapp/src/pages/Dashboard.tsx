import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, MapPin, Bell, ChevronRight } from "lucide-react";
import { Card, SectionTitle, Pill, Badge } from "../components/ui";
import { statusColors, timeline, industryMix } from "../lib/data";
import CompanyMap from "../components/CompanyMap";
import { useStore } from "../lib/store";

const RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "14d", label: "14 days", days: 14 },
  { id: "30d", label: "30 days", days: 30 },
];

const tooltipStyle = {
  background: "rgba(14,14,21,0.95)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  fontSize: 12,
  color: "#f6f5f3",
};
// recharts colors the label/items separately from the container — force white
const tipText = { color: "#f6f5f3" };

export default function Dashboard({ onOpenInbox }: { onOpenInbox: () => void }) {
  const { companies, openCount } = useStore();
  const [range, setRange] = useState("14d");
  const days = RANGES.find((r) => r.id === range)!.days;
  const data = timeline.slice(-Math.min(days, timeline.length));

  // derive headline numbers for the window
  const reached = data.reduce((s, d) => s + d.sent, 0);
  const replied = data.reduce((s, d) => s + d.replied, 0);
  const meetings = data.reduce((s, d) => s + d.meetings, 0);
  const replyRate = reached ? ((replied / reached) * 100).toFixed(1) : "0";

  // response breakdown for the donut
  const responses = [
    { name: "Replied", value: replied, fill: "#ff2d9b" },
    { name: "Opened, no reply", value: Math.round(reached * 0.4), fill: "#2f7dff" },
    { name: "No response", value: reached - replied - Math.round(reached * 0.4), fill: "#23232a" },
  ];

  const kpis = [
    { label: "Companies reached out", value: reached.toLocaleString(), delta: "+12.4%", up: true },
    { label: "Responded", value: replied.toLocaleString(), delta: "+6.1%", up: true },
    { label: "Reply rate", value: replyRate + "%", delta: "+2.3pt", up: true },
    { label: "Meetings booked", value: meetings.toLocaleString(), delta: "-4.0%", up: false },
  ];

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
          <p style={{ margin: "8px 0 0", color: "var(--text-faint)", fontSize: 14 }}>
            Reach, location and reply activity across your outreach.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {RANGES.map((r) => (
            <Pill key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </Pill>
          ))}
        </div>
      </div>

      {openCount > 0 && (
        <button
          onClick={onOpenInbox}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 16px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--panel-strong)",
            color: "var(--text)",
            textAlign: "left",
          }}
        >
          <Bell size={17} color="var(--accent)" />
          <span style={{ fontSize: 13.5 }}>
            <strong>{openCount} agent {openCount === 1 ? "request" : "requests"}</strong> need your decision — emailed to you automatically.
          </span>
          <ChevronRight size={16} style={{ marginLeft: "auto" }} color="var(--text-faint)" />
        </button>
      )}

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {kpis.map((k) => (
          <Card key={k.label} pad={18}>
            <div style={{ color: "var(--text-faint)", fontSize: 12.5 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10 }}>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{k.value}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 12.5,
                  color: k.up ? "var(--good)" : "var(--bad)",
                }}
              >
                {k.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {k.delta}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reached-out-over-time + response donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle title="Companies reached out over time" sub={`Last ${days} days · sent vs. replied`} />
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f7dff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2f7dff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff2d9b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ff2d9b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-faint)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
              <Area type="monotone" dataKey="sent" stroke="#2f7dff" strokeWidth={2} fill="url(#gSent)" name="Reached out" />
              <Area type="monotone" dataKey="replied" stroke="#ff2d9b" strokeWidth={2} fill="url(#gRep)" name="Replied" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle title="Have they responded?" sub={`${replyRate}% reply rate`} />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={responses} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="none">
                {responses.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
            {responses.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: r.fill }} />
                <span style={{ color: "var(--text-dim)", flex: 1 }}>{r.name}</span>
                <span style={{ fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Where (map) + What they do (industry) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle title="Where they are" sub="Targeted companies across the Netherlands" />
            <Badge color="var(--accent-3)">
              <MapPin size={11} /> {companies.length} locations
            </Badge>
          </div>
          <CompanyMap companies={companies} height={300} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
            {Object.entries(statusColors).map(([k, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
                <span style={{ textTransform: "capitalize" }}>{k}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="What they do" sub="Industry mix of contacted companies" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={industryMix} layout="vertical" margin={{ left: 18, right: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} width={86} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tipText} itemStyle={tipText} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                {industryMix.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent responses */}
      <Card>
        <SectionTitle title="Latest responses" sub="Most recent companies that replied" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {companies
            .filter((c) => c.status === "replied" || c.status === "won")
            .map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 180px 130px",
                  gap: 16,
                  alignItems: "center",
                  padding: "12px 4px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  fontSize: 13.5,
                }}
              >
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: "var(--text-dim)", textAlign: "right" }}>{c.industry}</div>
                <div style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <MapPin size={13} /> {c.city}
                </div>
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
