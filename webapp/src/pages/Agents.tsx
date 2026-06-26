import { Webhook, Bot, Brain, Database, FileText, Mail, Search, Globe, Table2, ArrowDown, CircleDot } from "lucide-react";
import { Card, Badge } from "../components/ui";

/**
 * Agent schema — mirrors the n8n "Voice-Activated Sales CRM Agent" workflow:
 * a single Orchestrator that delegates to three specialist sub-agents, each
 * with its own tools. This is the source of truth for how the backend runs.
 */

const triggers = [
  { name: "Chat webhook", detail: "/webhook/3c15…e909d42", icon: Webhook, active: true },
  { name: "Gmail trigger", detail: "polls every minute · disabled", icon: Mail, active: false },
];

const orchestrator = {
  model: "OpenRouter",
  memory: "Window buffer · 10 msgs",
  role: "Never acts directly. Reads the user's intent + history, routes each sub-task to the right specialist, then assembles one concise reply.",
};

const subagents = [
  {
    name: "ICP Research Agent",
    color: "#2f7dff",
    icon: Search,
    role: "Finds, enriches and scores ideal-customer companies (0–100) against the knowledge base. Returns results — never writes the CRM.",
    tools: [
      { name: "Google Docs — knowledge base", icon: FileText },
      { name: "Apify + web search", icon: Globe },
    ],
    model: null as string | null,
    sheet: null as string | null,
  },
  {
    name: "CRM Agent",
    color: "#4fd06a",
    icon: Database,
    role: "The only agent that reads/writes the CRM sheet. Adds rows, updates status, and queries for the others. Matches on company_id.",
    tools: [
      { name: "Append / update row", icon: Database },
      { name: "Get rows", icon: Table2 },
      { name: "SearchCRM (dedupe)", icon: Search },
    ],
    model: "OpenRouter" as string | null,
    sheet: "Demo CRM · Google Sheets" as string | null,
  },
  {
    name: "Outreach Agent",
    color: "#ff8a3d",
    icon: Mail,
    role: "Drafts and sends personalized first emails + counter-pitches via Gmail. Hard send-guards; bulk sends need approval. Never touches the CRM.",
    tools: [{ name: "SendEmail (Gmail)", icon: Mail }],
    model: null as string | null,
    sheet: null as string | null,
  },
];

const statuses = ["Uncontacted", "Awaiting Reply", "Rejected", "Counter Rejection", "Owner Input Needed", "Meeting Booked", "Shutdown"];
const statusColor = (s: string) =>
  s === "Meeting Booked" ? "var(--good)" : s === "Shutdown" || s === "Rejected" ? "var(--bad)" : s === "Owner Input Needed" ? "var(--warn)" : "var(--accent-2)";

export default function Agents() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
          Agent schema
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Your automation crew</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-faint)", fontSize: 14 }}>
          One orchestrator, three specialists — exactly as wired in n8n.
        </p>
      </div>

      {/* Triggers */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {triggers.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.name} pad={14} style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 12, opacity: t.active ? 1 : 0.55 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
                <Icon size={16} color={t.active ? "var(--accent)" : "var(--text-faint)"} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>{t.detail}</div>
              </div>
              <Badge color={t.active ? "var(--good)" : "var(--text-faint)"}>{t.active ? "live" : "off"}</Badge>
            </Card>
          );
        })}
      </div>

      <ArrowDown size={18} color="var(--text-faint)" style={{ alignSelf: "center" }} />

      {/* Orchestrator */}
      <Card style={{ border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))", background: "var(--grad-soft)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-gemini)", flexShrink: 0 }}>
            <Brain size={22} color="#0a0a0f" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 650, fontSize: 17 }}>Orchestrator Agent</span>
              <Badge color="var(--accent)">router</Badge>
              <Chip icon={<Brain size={11} />}>{orchestrator.model}</Chip>
              <Chip icon={<CircleDot size={11} />}>{orchestrator.memory}</Chip>
            </div>
            <p style={{ margin: "8px 0 0", color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.55 }}>{orchestrator.role}</p>
          </div>
        </div>
      </Card>

      <ArrowDown size={18} color="var(--text-faint)" style={{ alignSelf: "center" }} />

      {/* Specialists */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {subagents.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${a.color} 16%, transparent)`, border: "1px solid var(--border)" }}>
                  <Icon size={18} color={a.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>sub-agent · tool</div>
                </div>
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>{a.role}</p>

              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Tools</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {a.tools.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-dim)" }}>
                      <TIcon size={14} color={a.color} /> {t.name}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {a.model && <Chip icon={<Brain size={11} />}>{a.model}</Chip>}
                {a.sheet && <Chip icon={<Table2 size={11} />}>{a.sheet}</Chip>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* CRM status lifecycle */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Bot size={16} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>CRM status lifecycle</span>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>— the only values the CRM Agent may write</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {statuses.map((s) => (
            <Badge key={s} color={statusColor(s)}>
              {s}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-dim)", padding: "3px 9px", borderRadius: 999, background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
      {icon}
      {children}
    </span>
  );
}
