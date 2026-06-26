import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, MessageSquare, Trash2, Send, Mic, Square, Volume2, VolumeX,
  Sparkles, Settings2, ChevronDown, Wifi, WifiOff, Loader2, Activity,
  Wrench, Copy, Check, PanelLeft, PanelRight, X, AudioLines,
} from "lucide-react";
import Markdown from "../components/Markdown";
import { useVoiceIO } from "../lib/useVoiceIO";
import {
  ENDPOINT_KEY, sendToAgent, estimateTokens, type ToolEvent, type ChatTurn,
} from "../lib/agent";

const AGENT_KEY = "mooizicht_11labs_agent";
const SESSIONS_KEY = "mooizicht_asst_sessions";

type Msg = { id: string; role: "user" | "agent"; text: string; streaming?: boolean };
type Session = { id: string; title: string; messages: Msg[]; createdAt: number };
type Conn = "offline" | "idle" | "connecting" | "streaming" | "error";

const AGENTS = [
  { id: "orchestrator", label: "Orchestrator", hint: "routes to the right specialist" },
  { id: "researcher", label: "Researcher", hint: "finds & enriches companies" },
  { id: "composer", label: "Composer", hint: "drafts outreach emails" },
  { id: "replier", label: "Replier", hint: "handles inbound replies" },
];

const GREETING =
  "Hi — I'm your outreach agent. Ask me to **find companies**, **draft emails**, check **who replied**, or update the CRM.";

const uid = () => Math.random().toString(36).slice(2, 10);
const newSession = (): Session => ({
  id: uid(),
  title: "New chat",
  messages: [{ id: uid(), role: "agent", text: GREETING }],
  createdAt: Date.now(),
});

export default function Assistant() {
  // ---- config ----------------------------------------------------------
  const envEndpoint = (import.meta as any).env?.VITE_CHAT_ENDPOINT as string | undefined;
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem(ENDPOINT_KEY) || envEndpoint || "");
  const elevenAgent = useMemo(() => {
    const env = (import.meta as any).env?.VITE_ELEVENLABS_AGENT_ID as string | undefined;
    return localStorage.getItem(AGENT_KEY) || env || "";
  }, []);
  const [agent, setAgent] = useState(AGENTS[0]);
  const [agentMenu, setAgentMenu] = useState(false);
  const [showCfg, setShowCfg] = useState(false);

  // ---- sessions --------------------------------------------------------
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* ignore */ }
    return [newSession()];
  });
  const [activeId, setActiveId] = useState(() => sessions[0].id);
  const active = sessions.find((s) => s.id === activeId) || sessions[0];

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 40)));
  }, [sessions]);

  const patchActive = (fn: (s: Session) => Session) =>
    setSessions((ss) => ss.map((s) => (s.id === activeId ? fn(s) : s)));

  // ---- telemetry -------------------------------------------------------
  const [conn, setConn] = useState<Conn>(endpoint ? "idle" : "offline");
  const [model, setModel] = useState<string>("—");
  const [latency, setLatency] = useState<number | null>(null);
  const [tokensIn, setTokensIn] = useState(0);
  const [tokensOut, setTokensOut] = useState(0);
  const [tools, setTools] = useState<ToolEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setConn(endpoint ? "idle" : "offline"), [endpoint]);

  // ---- composer + voice ------------------------------------------------
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const voice = useVoiceIO({ onFinal: (t) => setInput((cur) => (cur ? cur + " " : "") + t) });
  const ptt = useRef<{ down: number } | null>(null);

  // mobile drawers
  const [sideOpen, setSideOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [active.messages, reduce]);

  // ---- send ------------------------------------------------------------
  const send = async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    voice.stopListening();

    const history: ChatTurn[] = active.messages
      .filter((m) => m.text !== GREETING)
      .map((m) => ({ role: m.role, content: m.text }));

    const userMsg: Msg = { id: uid(), role: "user", text: prompt };
    const agentMsg: Msg = { id: uid(), role: "agent", text: "", streaming: true };
    patchActive((s) => ({
      ...s,
      title: s.title === "New chat" ? prompt.slice(0, 40) : s.title,
      messages: [...s.messages, userMsg, agentMsg],
    }));
    setInput("");
    setBusy(true);
    setTokensIn((n) => n + estimateTokens(prompt));
    setTools([]);

    if (!endpoint) {
      await new Promise((r) => setTimeout(r, 450));
      const demo = `I'd route “${prompt}” to the **${agent.label}** agent, but no backend endpoint is set yet. Add one via the ⚙ settings — point it at your n8n webhook or \`/api/chat\`.`;
      patchActive((s) => ({ ...s, messages: s.messages.map((m) => (m.id === agentMsg.id ? { ...m, text: demo, streaming: false } : m)) }));
      setBusy(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setConn("connecting");
    let first = true;

    try {
      const res = await sendToAgent(endpoint, prompt, history, {
        signal: ctrl.signal,
        onToken: (chunk) => {
          if (first) { setConn("streaming"); first = false; }
          patchActive((s) => ({ ...s, messages: s.messages.map((m) => (m.id === agentMsg.id ? { ...m, text: m.text + chunk } : m)) }));
        },
        onTool: (ev) => setTools((t) => [ev, ...t].slice(0, 8)),
      });
      patchActive((s) => ({ ...s, messages: s.messages.map((m) => (m.id === agentMsg.id ? { ...m, text: res.text, streaming: false } : m)) }));
      if (res.model) setModel(res.model);
      setLatency(Math.round(res.latencyMs));
      setTokensOut((n) => n + estimateTokens(res.text));
      setConn("idle");
      // speak the reply when not muted (skip the streamed case mid-render)
      if (!voice.muted) voice.speak(agentMsg.id, res.text);
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      patchActive((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === agentMsg.id
            ? { ...m, streaming: false, text: aborted ? (m.text || "_(stopped)_") : `⚠️ Couldn't reach the agent backend: ${e.message}. Check the endpoint and its CORS settings.` }
            : m
        ),
      }));
      setConn(aborted ? "idle" : "error");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const saveEndpoint = (v: string) => { setEndpoint(v); localStorage.setItem(ENDPOINT_KEY, v); };

  const removeSession = (id: string) => {
    setSessions((ss) => {
      const next = ss.filter((s) => s.id !== id);
      const final = next.length ? next : [newSession()];
      if (id === activeId) setActiveId(final[0].id);
      return final;
    });
  };
  const addSession = () => {
    const s = newSession();
    setSessions((ss) => [s, ...ss]);
    setActiveId(s.id);
    setSideOpen(false);
  };

  // mic button: quick tap = toggle, press-and-hold = push-to-talk
  const micDown = () => { ptt.current = { down: Date.now() }; if (voice.micState !== "listening") voice.startListening(); };
  const micUp = () => {
    const held = ptt.current ? Date.now() - ptt.current.down : 0;
    ptt.current = null;
    if (held > 350 && voice.micState === "listening") voice.stopListening(); // release after a hold
    else if (held <= 350 && voice.micState === "listening" && held > 0) { /* tap: leave it on (toggle) */ }
  };
  const micClick = () => { if (voice.micState === "listening") voice.stopListening(); };

  return (
    <div className="asst">
      {/* mobile top bar */}
      <div className="asst__mobile-bar" style={{ gridColumn: "1 / -1", alignItems: "center", gap: 10, padding: "2px 2px 6px" }}>
        <button onClick={() => setSideOpen(true)} aria-label="Open sessions" className="glass-surface" style={iconBtn}><PanelLeft size={17} /></button>
        <div style={{ flex: 1, fontWeight: 600 }}>Assistant</div>
        <button onClick={() => setRailOpen(true)} aria-label="Open status" className="glass-surface" style={iconBtn}><PanelRight size={17} /></button>
      </div>
      <div className={`asst__scrim ${sideOpen || railOpen ? "is-open" : ""}`} onClick={() => { setSideOpen(false); setRailOpen(false); }} />

      {/* ============ LEFT: sessions ============ */}
      <aside className={`asst__pane asst__sidebar glass-surface ${sideOpen ? "is-open" : ""}`} style={paneBox}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--grad-gemini)", display: "grid", placeItems: "center" }}>
            <Sparkles size={15} color="#0a0a0f" />
          </div>
          <div style={{ fontWeight: 600, fontSize: 14.5, flex: 1 }}>Conversations</div>
          <button onClick={() => setSideOpen(false)} className="asst__mobile-bar" style={{ ...iconBtn, padding: 2 }} aria-label="Close"><X size={16} /></button>
        </div>

        <button onClick={addSession} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--border-strong)", background: "var(--panel-strong)", color: "var(--text)", fontSize: 13.5, fontWeight: 500, marginBottom: 10 }}>
          <Plus size={16} color="var(--accent)" /> New chat
        </button>

        {/* agent selector */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <button onClick={() => setAgentMenu((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 13 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)" }} />
            <span style={{ flex: 1, textAlign: "left" }}>{agent.label}</span>
            <ChevronDown size={15} color="var(--text-faint)" />
          </button>
          {agentMenu && (
            <div className="glass-surface" style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 5, borderRadius: 11, padding: 5, border: "1px solid var(--border-strong)" }}>
              {AGENTS.map((a) => (
                <button key={a.id} onClick={() => { setAgent(a); setAgentMenu(false); }} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: a.id === agent.id ? "var(--panel-strong)" : "transparent", color: "var(--text)", fontSize: 13 }}>
                  <div style={{ fontWeight: 500 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{a.hint}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, margin: "0 -4px", padding: "0 4px" }}>
          {sessions.map((s) => (
            <div key={s.id} onClick={() => { setActiveId(s.id); setSideOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, cursor: "pointer", background: s.id === activeId ? "var(--panel-strong)" : "transparent", border: "1px solid", borderColor: s.id === activeId ? "var(--border)" : "transparent" }}>
              <MessageSquare size={14} color={s.id === activeId ? "var(--accent)" : "var(--text-faint)"} />
              <span style={{ flex: 1, fontSize: 13, color: s.id === activeId ? "var(--text)" : "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); removeSession(s.id); }} aria-label="Delete chat" style={{ ...iconBtn, padding: 3, opacity: 0.6 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </aside>

      {/* ============ CENTER: thread ============ */}
      <section className="asst__pane" style={{ ...paneBox, padding: 0, overflow: "hidden" }}>
        <div ref={threadRef} role="log" aria-live="polite" aria-label="Conversation" style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {active.messages.map((m) => (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 5 }}>
              <div style={{ maxWidth: "86%", padding: "11px 14px", borderRadius: 15, background: m.role === "user" ? "var(--grad-soft)" : "var(--panel-strong)", border: "1px solid var(--border)", color: m.role === "user" ? "var(--text)" : "var(--text)", borderBottomRightRadius: m.role === "user" ? 5 : 15, borderBottomLeftRadius: m.role === "agent" ? 5 : 15 }}>
                {m.role === "agent" ? (
                  m.text ? <Markdown text={m.text} /> : <span style={{ color: "var(--text-faint)", fontSize: 13.5 }}>agent is thinking…</span>
                ) : (
                  <span style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</span>
                )}
                {m.streaming && m.text && <span style={{ display: "inline-block", width: 7, height: 14, marginLeft: 2, background: "var(--accent)", verticalAlign: "text-bottom", animation: "blink 1s steps(2) infinite" }} />}
              </div>
              {m.role === "agent" && m.text && !m.streaming && <MsgActions text={m.text} speaking={voice.speakingId === m.id} onSpeak={() => (voice.speakingId === m.id ? voice.stopSpeaking() : voice.speak(m.id, m.text))} ttsSupported={voice.ttsSupported} />}
            </div>
          ))}
        </div>

        {/* composer */}
        <div className="glass-surface" style={{ margin: 12, marginTop: 0, padding: 10, borderRadius: 15, border: "1px solid var(--border-strong)" }}>
          {voice.micState === "denied" && (
            <div style={{ fontSize: 11.5, color: "var(--warn)", marginBottom: 8, paddingLeft: 4 }}>Mic access denied — continuing in text-only mode.</div>
          )}
          {voice.micState === "listening" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingLeft: 4 }}>
              <Meter level={voice.level} />
              <span style={{ fontSize: 12, color: "var(--magenta)" }}>Listening… {voice.interim && <em style={{ color: "var(--text-dim)" }}>“{voice.interim}”</em>}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button
              onPointerDown={micDown}
              onPointerUp={micUp}
              onClick={micClick}
              title={voice.micState === "unsupported" ? "Speech recognition not available in this browser" : "Tap to toggle · hold to push-to-talk"}
              disabled={voice.micState === "unsupported"}
              aria-pressed={voice.micState === "listening"}
              style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, border: "1px solid var(--border)", background: voice.micState === "listening" ? "var(--magenta)" : "var(--panel)", color: voice.micState === "listening" ? "#fff" : "var(--text-dim)", display: "grid", placeItems: "center", opacity: voice.micState === "unsupported" ? 0.4 : 1 }}
            >
              <Mic size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={`Message the ${agent.label}…  (Enter to send, Shift+Enter for newline)`}
              style={{ flex: 1, resize: "none", maxHeight: 140, padding: "11px 13px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 14, lineHeight: 1.5, outline: "none", fontFamily: "inherit" }}
            />
            {busy ? (
              <button onClick={stop} title="Stop" style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, border: "none", background: "var(--panel-strong)", color: "var(--text)", display: "grid", placeItems: "center" }}>
                <Square size={16} />
              </button>
            ) : (
              <button onClick={() => send()} disabled={!input.trim()} title="Send" style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, border: "none", background: input.trim() ? "var(--accent)" : "var(--panel-strong)", color: "#1a0e06", display: "grid", placeItems: "center" }}>
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ============ RIGHT: status / telemetry ============ */}
      <aside className={`asst__pane asst__rail glass-surface ${railOpen ? "is-open" : ""}`} style={paneBox}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Activity size={16} color="var(--accent)" />
          <div style={{ fontWeight: 600, fontSize: 14.5, flex: 1 }}>Status</div>
          <button onClick={() => setShowCfg((s) => !s)} title="Endpoint settings" style={iconBtn}><Settings2 size={15} /></button>
          <button onClick={() => setRailOpen(false)} className="asst__mobile-bar" style={{ ...iconBtn, padding: 2 }} aria-label="Close"><X size={16} /></button>
        </div>

        <ConnBadge conn={conn} />

        {showCfg && (
          <div style={{ margin: "12px 0", padding: "11px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--panel)" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 6 }}>Agent endpoint (n8n webhook or /api/chat)</div>
            <input value={endpoint} onChange={(e) => saveEndpoint(e.target.value)} placeholder="https://…/webhook/chat" style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--mono)", outline: "none" }} />
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
              Voice: {elevenAgent ? <span style={{ color: "var(--good)" }}>ElevenLabs agent connected</span> : "browser Web Speech (built-in)"}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0" }}>
          <Stat label="Model" value={model} mono />
          <Stat label="Latency" value={latency != null ? `${latency} ms` : "—"} />
          <Stat label="Tokens in" value={String(tokensIn)} />
          <Stat label="Tokens out" value={String(tokensOut)} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <Wrench size={13} color="var(--text-faint)" />
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Agent actions</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {tools.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>Tool calls and agent actions stream here while a request runs.</div>
          ) : (
            tools.map((t, i) => (
              <div key={i} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 12 }}>
                <div style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{t.name}</div>
                {t.detail && <div style={{ color: "var(--text-dim)", marginTop: 2 }}>{t.detail}</div>}
              </div>
            ))
          )}
        </div>

        {/* global TTS mute */}
        <button onClick={voice.toggleMute} style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--panel)", color: voice.muted ? "var(--text-faint)" : "var(--text)", fontSize: 12.5 }}>
          {voice.muted ? <VolumeX size={15} /> : <Volume2 size={15} color="var(--accent-2)" />} {voice.muted ? "Voice replies muted" : "Voice replies on"}
        </button>
        {elevenAgent && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <AudioLines size={12} color="var(--accent-2)" /> Full-duplex voice via the topbar “Talk”.
          </div>
        )}
      </aside>
    </div>
  );
}

/* ----------------------------------------------------------- subcomponents */

function MsgActions({ text, speaking, onSpeak, ttsSupported }: { text: string; speaking: boolean; onSpeak: () => void; ttsSupported: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* */ } };
  return (
    <div style={{ display: "flex", gap: 6, paddingLeft: 4 }}>
      <button onClick={copy} title="Copy" style={{ ...miniBtn, color: copied ? "var(--good)" : "var(--text-faint)" }}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
      {ttsSupported && (
        <button onClick={onSpeak} title={speaking ? "Stop" : "Speak"} style={{ ...miniBtn, color: speaking ? "var(--accent-2)" : "var(--text-faint)" }}>
          {speaking ? <Square size={12} /> : <Volume2 size={13} />}
        </button>
      )}
    </div>
  );
}

function Meter({ level }: { level: number }) {
  const bars = 14;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 18 }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const center = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const h = 3 + level * 15 * (0.5 + center) * (0.7 + ((i * 7) % 5) / 10);
        return <span key={i} style={{ width: 2.5, height: Math.min(18, h), borderRadius: 2, background: "var(--magenta)", transition: "height .07s linear" }} />;
      })}
    </div>
  );
}

function ConnBadge({ conn }: { conn: Conn }) {
  const map: Record<Conn, { c: string; t: string; icon: React.ReactNode }> = {
    offline: { c: "var(--text-faint)", t: "No backend set", icon: <WifiOff size={14} /> },
    idle: { c: "var(--good)", t: "Connected", icon: <Wifi size={14} /> },
    connecting: { c: "var(--warn)", t: "Connecting…", icon: <Loader2 size={14} className="asst-spin" /> },
    streaming: { c: "var(--accent-2)", t: "Streaming response", icon: <Loader2 size={14} className="asst-spin" /> },
    error: { c: "var(--bad)", t: "Connection error — retry to reconnect", icon: <WifiOff size={14} /> },
  };
  const s = map[conn];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--panel)", color: s.c, fontSize: 12.5 }}>
      {s.icon} <span>{s.t}</span>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)" }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, fontFamily: mono ? "var(--mono)" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

const paneBox: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--border)", padding: 14 };
const iconBtn: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, width: 34, height: 34, color: "var(--text-dim)", display: "grid", placeItems: "center" };
const miniBtn: React.CSSProperties = { background: "none", border: "none", padding: 3, display: "grid", placeItems: "center" };
