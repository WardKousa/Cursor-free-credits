import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Settings2, Sparkles } from "lucide-react";

const ENDPOINT_KEY = "mooizicht_chat_endpoint";

type Msg = { role: "user" | "agent"; text: string };

const GREETING: Msg = {
  role: "agent",
  text: "Hi — I'm your outreach agent. Ask me to find companies, draft emails, check who replied, or update the CRM.",
};

// Pull the assistant text out of whatever shape the backend returns.
// Handles plain strings, array-wrapped payloads (common from n8n webhooks),
// the n8n AI Agent `output` field, and the usual reply/text/message keys.
function extractReply(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "(empty response from agent)";

  let data: any;
  try {
    data = JSON.parse(trimmed);
  } catch {
    // Not JSON — the body itself is the reply (e.g. plain-text webhook).
    return trimmed;
  }

  const fromObject = (o: any): string | undefined => {
    if (o == null) return undefined;
    if (typeof o === "string") return o;
    if (Array.isArray(o)) {
      for (const item of o) {
        const r = fromObject(item);
        if (r) return r;
      }
      return undefined;
    }
    if (typeof o === "object") {
      const v =
        o.reply ?? o.output ?? o.text ?? o.message ?? o.answer ??
        o.response ?? o.content ?? o.json ?? o.data ?? o.result;
      if (v != null) return fromObject(v);
    }
    return undefined;
  };

  const reply = fromObject(data);
  if (reply) return String(reply);

  // JSON we couldn't map — show it rather than a useless placeholder.
  return typeof data === "object" ? JSON.stringify(data) : String(data);
}

/** Controlled agent chat dropdown. Opened from the Ask bar in the topbar. */
export default function AgentChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [showCfg, setShowCfg] = useState(false);
  const envEndpoint = (import.meta as any).env?.VITE_CHAT_ENDPOINT as string | undefined;
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem(ENDPOINT_KEY) || envEndpoint || "");
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const saveEndpoint = (v: string) => {
    setEndpoint(v);
    localStorage.setItem(ENDPOINT_KEY, v);
  };

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    const history = msgs.filter((m) => m !== GREETING).map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setBusy(true);
    try {
      if (!endpoint) {
        await new Promise((r) => setTimeout(r, 400));
        setMsgs((m) => [...m, { role: "agent", text: `I'd route “${prompt}” to the n8n orchestrator, but no backend endpoint is set. Add one via ⚙.` }]);
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, history }),
        });
        const raw = await res.text();
        const reply = extractReply(raw);
        setMsgs((m) => [...m, { role: "agent", text: reply }]);
      }
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "agent", text: `Couldn't reach the agent backend: ${e.message}. Make sure it's running on :8080 and allows this origin (CORS).` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 24,
          width: 400,
          maxWidth: "92vw",
          height: 540,
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 18,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-1)",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
          animation: "fadeUp .2s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--grad-gemini)", display: "grid", placeItems: "center" }}>
            <Sparkles size={15} color="#0a0a0f" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Ask mooizicht</div>
            <div style={{ fontSize: 11, color: endpoint ? "var(--good)" : "var(--text-faint)" }}>{endpoint ? "● connected to your agent" : "○ no backend set"}</div>
          </div>
          <button onClick={() => setShowCfg((s) => !s)} title="Endpoint settings" style={iconBtn}>
            <Settings2 size={15} />
          </button>
          <button onClick={onClose} style={iconBtn}>
            <X size={17} />
          </button>
        </div>

        {showCfg && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 6 }}>Agent endpoint (defaults from .env)</div>
            <input
              value={endpoint}
              onChange={(e) => saveEndpoint(e.target.value)}
              placeholder="http://localhost:8080/api/chat"
              style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--mono)", outline: "none" }}
            />
          </div>
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 13px",
                borderRadius: 13,
                fontSize: 13.5,
                lineHeight: 1.5,
                background: m.role === "user" ? "var(--grad-soft)" : "var(--panel-strong)",
                border: "1px solid var(--border)",
                color: m.role === "user" ? "var(--text)" : "var(--text-dim)",
                borderBottomRightRadius: m.role === "user" ? 4 : 13,
                borderBottomLeftRadius: m.role === "agent" ? 4 : 13,
              }}
            >
              {m.text}
            </div>
          ))}
          {busy && <div style={{ alignSelf: "flex-start", color: "var(--text-faint)", fontSize: 12.5, padding: "4px 6px" }}>agent is thinking…</div>}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Find companies, draft emails, update the CRM…"
            style={{ flex: 1, padding: "11px 13px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 13.5, outline: "none" }}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            style={{ width: 42, borderRadius: 11, border: "none", background: input.trim() ? "var(--accent)" : "var(--panel-strong)", color: "#1a0e06", display: "grid", placeItems: "center", opacity: busy ? 0.6 : 1 }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--text-faint)", display: "grid", placeItems: "center", padding: 4, cursor: "pointer" };
