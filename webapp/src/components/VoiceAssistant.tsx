import { createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X, AudioLines, Square, Loader2 } from "lucide-react";
import { ENDPOINT_KEY, sendToAgent, type ChatTurn } from "../lib/agent";

const AGENT_KEY = "mooizicht_11labs_agent";

/** Loads the ElevenLabs ConvAI embed script once. */
function useConvaiScript(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (document.querySelector("script[data-elevenlabs-convai]")) return;
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    s.async = true;
    s.type = "text/javascript";
    s.setAttribute("data-elevenlabs-convai", "1");
    document.body.appendChild(s);
  }, [active]);
}

const stripForSpeech = (s: string) =>
  s.replace(/```[\s\S]*?```/g, " code block ").replace(/[#*`_>]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();

type VState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Voice "Talk" — a full spoken loop with the agent:
 *   speak → Web Speech STT → POST to the agent backend (n8n) → speak the reply.
 * It actually answers and runs the agent's tools (the backend does the work),
 * not just transcribe. When an ElevenLabs agent ID is set, the full-duplex
 * ConvAI widget is used instead.
 */
export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const envAgent = (import.meta as any).env?.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const [agentId, setAgentId] = useState(() => localStorage.getItem(AGENT_KEY) || envAgent || "");
  const [draft, setDraft] = useState("");

  const envEndpoint = (import.meta as any).env?.VITE_CHAT_ENDPOINT as string | undefined;
  const endpoint = localStorage.getItem(ENDPOINT_KEY) || envEndpoint || "";

  const [state, setState] = useState<VState>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const recRef = useRef<any>(null);
  const convoRef = useRef(false); // conversation active → re-listen after each reply
  const historyRef = useRef<ChatTurn[]>([]);

  useConvaiScript(open && !!agentId);

  const stopRecognition = () => { try { recRef.current?.stop(); } catch { /* */ } recRef.current = null; };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition isn't available in this browser. Use Chrome/Edge, or connect an ElevenLabs agent."); return; }
    window.speechSynthesis?.cancel(); // barge-in: stop any reply being spoken
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setHeard(text);
      if (e.results[e.results.length - 1].isFinal) handleFinal(text.trim());
    };
    rec.onerror = (e: any) => { if (e.error === "not-allowed") setError("Microphone permission denied."); };
    rec.onend = () => { setState((s) => (s === "listening" ? "idle" : s)); };
    rec.start();
    recRef.current = rec;
    setState("listening");
    setHeard("");
    setError("");
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) { setState("idle"); relisten(); return; }
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.lang = "en-US";
    u.onstart = () => setState("speaking");
    u.onend = () => { setState("idle"); relisten(); };
    u.onerror = () => { setState("idle"); relisten(); };
    window.speechSynthesis.speak(u);
  };

  const relisten = () => { if (convoRef.current) setTimeout(() => { if (convoRef.current) startListening(); }, 350); };

  const handleFinal = async (text: string) => {
    stopRecognition();
    if (!text) { relisten(); return; }
    setState("thinking");
    historyRef.current.push({ role: "user", content: text });
    try {
      if (!endpoint) { const r = "No agent endpoint is set yet — add one in the Assistant settings."; setReply(r); speak(r); return; }
      const res = await sendToAgent(endpoint, text, historyRef.current.slice(0, -1));
      historyRef.current.push({ role: "agent", content: res.text });
      setReply(res.text);
      speak(res.text);
    } catch (e: any) {
      const r = `Couldn't reach the agent: ${e.message}.`;
      setReply(r);
      speak(r);
    }
  };

  const startConversation = () => { convoRef.current = true; historyRef.current = []; setReply(""); startListening(); };
  const stopConversation = () => { convoRef.current = false; stopRecognition(); window.speechSynthesis?.cancel(); setState("idle"); };

  const close = () => { stopConversation(); setOpen(false); };
  const saveAgent = () => { localStorage.setItem(AGENT_KEY, draft.trim()); setAgentId(draft.trim()); };

  useEffect(() => () => { stopRecognition(); window.speechSynthesis?.cancel(); }, []);

  const stateLabel: Record<VState, string> = {
    idle: "Tap to start talking",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
  };
  const active = state !== "idle";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Talk to mooizicht"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 11, border: "1px solid color-mix(in srgb, var(--accent-2) 40%, transparent)", background: "color-mix(in srgb, var(--accent-2) 12%, transparent)", color: "var(--accent-2)", fontSize: 13, fontWeight: 500 }}
      >
        <AudioLines size={16} /> Talk
      </button>

      {open && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <div onClick={close} style={{ position: "absolute", inset: 0 }} />
          <div className="glass-surface" style={{ position: "absolute", top: 70, right: 24, width: 380, maxWidth: "92vw", borderRadius: 18, border: "1px solid var(--border-strong)", padding: 20, animation: "fadeUp .2s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--grad-gemini)", display: "grid", placeItems: "center" }}>
                <AudioLines size={17} color="#0a0a0f" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Talk to mooizicht</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Speak — it answers out loud and runs the agent</div>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", color: "var(--text-faint)" }}>
                <X size={18} />
              </button>
            </div>

            {agentId ? (
              // Full-duplex ElevenLabs conversational agent
              <div style={{ marginTop: 14 }}>
                {createElement("elevenlabs-convai", { "agent-id": agentId } as any)}
                <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 12, lineHeight: 1.6 }}>
                  ElevenLabs agent <code style={{ fontFamily: "var(--mono)" }}>{agentId.slice(0, 10)}…</code>.{" "}
                  <button onClick={() => { localStorage.removeItem(AGENT_KEY); setAgentId(""); }} style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", padding: 0, fontSize: 11.5 }}>change</button>
                </p>
              </div>
            ) : (
              // Web Speech STT → agent → TTS conversation loop
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <button
                  onClick={active ? stopConversation : startConversation}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px", borderRadius: 14, border: `1px solid ${active ? "color-mix(in srgb, var(--magenta) 45%, transparent)" : "var(--border-strong)"}`, background: active ? "color-mix(in srgb, var(--magenta) 10%, transparent)" : "var(--panel)", color: "var(--text)" }}
                >
                  <div style={{ width: 60, height: 60, borderRadius: 999, display: "grid", placeItems: "center", background: state === "listening" ? "var(--magenta)" : active ? "var(--panel-strong)" : "var(--grad-gemini)", boxShadow: state === "listening" ? "0 0 0 8px color-mix(in srgb, var(--magenta) 18%, transparent)" : "none", transition: "all .2s" }}>
                    {state === "thinking" ? <Loader2 size={24} color="#fff" className="asst-spin" />
                      : active ? <Square size={22} color="#fff" />
                      : <Mic size={24} color="#0a0a0f" />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{active ? "Tap to stop" : stateLabel.idle}</span>
                  {active && <span style={{ fontSize: 11.5, color: "var(--magenta)" }}>{stateLabel[state]}</span>}
                </button>

                {heard && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>You: “{heard}”</div>}
                {reply && (
                  <div style={{ padding: "11px 13px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, maxHeight: 160, overflowY: "auto" }}>
                    {reply}
                  </div>
                )}
                {error && <div style={{ fontSize: 12, color: "var(--warn)", lineHeight: 1.5 }}>{error}</div>}

                {!endpoint && (
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
                    Tip: set the agent endpoint in the Assistant ⚙ so Talk can reach the backend.
                  </div>
                )}

                {/* optional: connect a full-duplex ElevenLabs agent */}
                <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ElevenLabs agent id (optional)" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 12, fontFamily: "var(--mono)", outline: "none" }} />
                  <button onClick={saveAgent} disabled={!draft.trim()} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: draft.trim() ? "var(--accent-2)" : "var(--panel-strong)", color: "#fff", fontSize: 12.5, fontWeight: 500 }}>Connect</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
