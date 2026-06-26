import { useState } from "react";
import { Send, Inbox as InboxIcon } from "lucide-react";
import Outreach from "./Outreach";
import Communications from "./Communications";

/** Merged Outreach + Communications under one tab, switched by a sub-tab bar.
 *  Each child keeps its own header/body; only one renders at a time. */
export default function OutreachComms() {
  const [tab, setTab] = useState<"campaigns" | "inbox">("campaigns");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <SubTab active={tab === "campaigns"} onClick={() => setTab("campaigns")} icon={<Send size={15} />}>
          Campaigns
        </SubTab>
        <SubTab active={tab === "inbox"} onClick={() => setTab("inbox")} icon={<InboxIcon size={15} />}>
          Inbox
        </SubTab>
      </div>
      {tab === "campaigns" ? <Outreach /> : <Communications />}
    </div>
  );
}

function SubTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: 11,
        border: "1px solid",
        borderColor: active ? "var(--border-strong)" : "var(--border)",
        background: active ? "var(--panel-strong)" : "transparent",
        color: active ? "var(--text)" : "var(--text-dim)",
        fontSize: 13.5,
        fontWeight: 500,
      }}
    >
      <span style={{ color: active ? "var(--accent)" : "currentColor" }}>{icon}</span>
      {children}
    </button>
  );
}
