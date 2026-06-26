import { Mail, Sparkles, Clock, CheckCheck, Zap } from "lucide-react";
import { Card, SectionTitle, Badge } from "../components/ui";
import { campaigns } from "../lib/data";
import { useStore } from "../lib/store";

const sequence = [
  { step: 1, label: "Intro email", delay: "Day 0", desc: "Personalized first touch referencing a company signal." },
  { step: 2, label: "Follow-up", delay: "Day 3", desc: "Soft bump with a relevant case study." },
  { step: 3, label: "Value nudge", delay: "Day 7", desc: "Share ROI estimate based on their size." },
  { step: 4, label: "Break-up", delay: "Day 12", desc: "Last email, leave the door open." },
];

export default function Outreach() {
  const { autopilot } = useStore();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            Outreach
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Email outreach</h1>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--good) 35%, transparent)", background: "color-mix(in srgb, var(--good) 10%, transparent)", color: "var(--good)", fontSize: 12.5, fontWeight: 500 }}>
          <Zap size={14} /> Autopilot {autopilot ? "on" : "off"} · Sender sends approved emails automatically
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Campaigns */}
        <Card>
          <SectionTitle title="Campaigns" sub="Live email programs by segment" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {campaigns.map((c) => (
              <div
                key={c.name}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
                  <Badge color={c.status === "active" ? "var(--good)" : "var(--warn)"}>{c.status}</Badge>
                </div>
                <div style={{ display: "flex", gap: 22, marginTop: 12 }}>
                  <Stat label="Sent" value={c.sent.toString()} />
                  <Stat label="Open" value={(c.openRate * 100).toFixed(0) + "%"} />
                  <Stat label="Reply" value={(c.replyRate * 100).toFixed(0) + "%"} />
                  <Stat label="Meetings" value={c.meetings.toString()} accent />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI draft preview */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Sparkles size={16} color="var(--accent-2)" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>AI draft · Hanze Software</span>
            <Badge color="var(--accent)">generated</Badge>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--panel)", fontSize: 12.5, color: "var(--text-dim)" }}>
              <div>
                <strong style={{ color: "var(--text)" }}>To:</strong> founder@hanze.software
              </div>
              <div style={{ marginTop: 4 }}>
                <strong style={{ color: "var(--text)" }}>Subject:</strong> Cutting your manual prospecting in half
              </div>
            </div>
            <div style={{ padding: 16, fontSize: 13.5, lineHeight: 1.65, color: "var(--text-dim)" }}>
              <p style={{ marginTop: 0 }}>Hi Sanne,</p>
              <p>
                Saw Hanze just shipped its new analytics module — congrats. Teams scaling that fast usually drown in manual
                prospecting, so I wanted to reach out.
              </p>
              <p>
                mooizicht runs autonomous agents that research companies, draft personalized emails and book meetings — fully
                on autopilot. One customer your size booked <strong style={{ color: "var(--text)" }}>22 meetings</strong> last
                month.
              </p>
              <p style={{ marginBottom: 0 }}>Worth a 15-min look next week?</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#0a0a0f", fontWeight: 600, fontSize: 13 }}>
              <Mail size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Send via Sender agent
            </button>
            <button style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", fontSize: 13 }}>
              Regenerate
            </button>
          </div>
        </Card>
      </div>

      {/* Sequence */}
      <Card>
        <SectionTitle title="Follow-up sequence" sub="Automatically scheduled by the Sender agent" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {sequence.map((s, i) => (
            <div key={s.step} style={{ position: "relative", padding: "16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: "var(--grad-gemini)", color: "#0a0a0f", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>
                  {s.step}
                </div>
                <span style={{ fontSize: 11.5, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> {s.delay}
                </span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {i === 0 && <CheckCheck size={13} color="var(--good)" />}
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: accent ? "var(--accent-2)" : "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{label}</div>
    </div>
  );
}
