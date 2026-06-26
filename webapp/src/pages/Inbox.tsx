import { useState } from "react";
import { Check, X, Mail, Bot, Bell, AlertTriangle, GitBranch, ExternalLink, Webhook, MessageSquare, Send } from "lucide-react";
import { Card, SectionTitle, Badge } from "../components/ui";
import { useStore, InboxItem } from "../lib/store";

const kindMeta: Record<InboxItem["kind"], { color: string; icon: typeof Bot; label: string }> = {
  approval: { color: "var(--accent)", icon: Check, label: "Approval" },
  decision: { color: "var(--accent-2)", icon: GitBranch, label: "Decision" },
  blocker: { color: "var(--bad)", icon: AlertTriangle, label: "Blocker" },
};

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export default function Inbox() {
  const { inbox, resolve, respond, gmailComposeUrl, autopilot, setAutopilot } = useStore();
  const open = inbox.filter((i) => i.status === "open");
  const done = inbox.filter((i) => i.status !== "open");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState("");

  const send = (id: string) => {
    if (!text.trim()) return;
    respond(id, text.trim());
    setText("");
    setReplyTo(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            Inbox
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Requests from your agents</h1>
        </div>
        <button
          onClick={() => setAutopilot(!autopilot)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 15px",
            borderRadius: 999,
            border: `1px solid ${autopilot ? "color-mix(in srgb, var(--good) 40%, transparent)" : "var(--border-strong)"}`,
            background: autopilot ? "color-mix(in srgb, var(--good) 12%, transparent)" : "transparent",
            color: autopilot ? "var(--good)" : "var(--text-dim)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: autopilot ? "var(--good)" : "var(--text-faint)" }} />
          Autopilot {autopilot ? "on" : "off"}
        </button>
      </div>

      {/* Open requests */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 12px" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Needs you</h2>
          {open.length > 0 && <Badge color="var(--accent)">{open.length} open</Badge>}
        </div>
        {open.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "26px 0", color: "var(--text-faint)" }}>
              <Check size={26} color="var(--good)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: "var(--text-dim)" }}>All clear — agents are running on autopilot.</div>
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {open.map((it) => {
              const meta = kindMeta[it.kind];
              const Icon = meta.icon;
              return (
                <Card key={it.id}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, border: "1px solid var(--border)" }}>
                      <Icon size={17} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5 }}>{it.title}</span>
                        <Badge color={meta.color}>{meta.label}</Badge>
                        {it.company && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>· {it.company}</span>}
                      </div>
                      <p style={{ margin: "7px 0 0", color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.55 }}>{it.detail}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 13, flexWrap: "wrap" }}>
                        <button onClick={() => resolve(it.id, "approved")} style={btn("var(--good)", true)}>
                          <Check size={14} /> Approve
                        </button>
                        <button onClick={() => resolve(it.id, "dismissed")} style={btn("var(--border-strong)")}>
                          <X size={14} /> Decline
                        </button>
                        <button onClick={() => setReplyTo(replyTo === it.id ? null : it.id)} style={btn(replyTo === it.id ? "var(--accent)" : "var(--border-strong)")}>
                          <MessageSquare size={14} /> Reply to agent
                        </button>
                        <a href={gmailComposeUrl(it)} target="_blank" rel="noreferrer" style={{ ...btn("var(--border-strong)"), textDecoration: "none" }}>
                          <Mail size={14} /> Open in Gmail <ExternalLink size={12} />
                        </a>
                        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Bot size={12} /> {it.agent} · {ago(it.createdAt)}
                        </span>
                      </div>

                      {replyTo === it.id && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                          <textarea
                            autoFocus
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(it.id);
                            }}
                            placeholder={`Tell the ${it.agent} agent what to do…  (e.g. “Book Thursday 10:00” / “Send it, but soften the CTA”)`}
                            rows={3}
                            style={{
                              width: "100%",
                              resize: "vertical",
                              padding: "11px 13px",
                              borderRadius: 10,
                              border: "1px solid var(--border-strong)",
                              background: "var(--bg-2)",
                              color: "var(--text)",
                              fontSize: 13.5,
                              fontFamily: "var(--font)",
                              outline: "none",
                              lineHeight: 1.5,
                            }}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => send(it.id)} style={btn("var(--accent)", true)}>
                              <Send size={14} /> Send to {it.agent}
                            </button>
                            <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>routes your instruction back to the agent · ⌘↵</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved */}
      {done.length > 0 && (
        <div>
          <h2 style={{ margin: "2px 0 12px", fontSize: 15, fontWeight: 600, color: "var(--text-dim)" }}>Resolved</h2>
          <Card pad={0}>
            {done.map((it, i) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 13.5 }}>
                <Badge color={it.status === "approved" ? "var(--good)" : "var(--text-faint)"}>{it.status}</Badge>
                <span style={{ color: "var(--text-dim)" }}>{it.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-faint)" }}>{it.agent}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, width: "100%" };

const btn = (color: string, solid = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 13px",
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  border: solid ? "none" : `1px solid ${color}`,
  background: solid ? color : "transparent",
  color: solid ? "#062a12" : "var(--text)",
});

function Field({ children, icon, label }: { children: React.ReactNode; icon?: React.ReactNode; label?: string }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 6 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
        {icon && <span style={{ color: "var(--text-faint)", display: "flex" }}>{icon}</span>}
        {children}
      </div>
    </div>
  );
}
