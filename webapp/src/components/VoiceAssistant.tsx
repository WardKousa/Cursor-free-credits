import { createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, X, AudioLines, KeyRound } from "lucide-react";

const AGENT_KEY = "mooizicht_11labs_agent";
const SUGGESTIONS = [
  "Show responses from tech companies with 50–200 employees",
  "Who replied this week?",
  "Start outreach to construction firms in Rotterdam",
  "Draft a follow-up for Hanze Software",
];

/** Loads the ElevenLabs ConvAI embed script once. */
function useConvaiScript(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (document.querySelector('script[data-elevenlabs-convai]')) return;
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    s.async = true;
    s.type = "text/javascript";
    s.setAttribute("data-elevenlabs-convai", "1");
    document.body.appendChild(s);
  }, [active]);
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const envAgent = (import.meta as any).env?.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const [agentId, setAgentId] = useState(() => localStorage.getItem(AGENT_KEY) || envAgent || "");
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);

  useConvaiScript(open && !!agentId);

  // Browser speech-to-text fallback (works without ElevenLabs configured)
  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setTranscript("Speech recognition isn't available in this browser — connect an ElevenLabs agent for full voice.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => setTranscript(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
    setTranscript("");
  };

  const saveAgent = () => {
    localStorage.setItem(AGENT_KEY, draft.trim());
    setAgentId(draft.trim());
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Talk to mooizicht"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: 11,
          border: "1px solid color-mix(in srgb, var(--accent-2) 40%, transparent)",
          background: "color-mix(in srgb, var(--accent-2) 12%, transparent)",
          color: "var(--accent-2)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <AudioLines size={16} /> Talk
      </button>

      {open && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0 }} />
          <div
            className="glass-surface"
            style={{
              position: "absolute",
              top: 70,
              right: 24,
              width: 380,
              maxWidth: "92vw",
              borderRadius: 18,
              border: "1px solid var(--border-strong)",
              padding: 20,
              animation: "fadeUp .2s ease both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--grad-gemini)", display: "grid", placeItems: "center" }}>
                <AudioLines size={17} color="#0a0a0f" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Talk to mooizicht</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Ask for companies, responses or actions by voice</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-faint)" }}>
                <X size={18} />
              </button>
            </div>

            {agentId ? (
              // Real ElevenLabs conversational agent
              <div style={{ marginTop: 14 }}>
                {createElement("elevenlabs-convai", { "agent-id": agentId } as any)}
                <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 12, lineHeight: 1.6 }}>
                  Connected to ElevenLabs agent <code style={{ fontFamily: "var(--mono)" }}>{agentId.slice(0, 10)}…</code>. Tap the
                  orb to start a live voice conversation.{" "}
                  <button onClick={() => { localStorage.removeItem(AGENT_KEY); setAgentId(""); }} style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", padding: 0, fontSize: 11.5 }}>
                    change agent
                  </button>
                </p>
              </div>
            ) : (
              // Fallback: browser mic demo + agent connect
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <button
                  onClick={toggleMic}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "22px",
                    borderRadius: 14,
                    border: `1px solid ${listening ? "color-mix(in srgb, var(--magenta) 50%, transparent)" : "var(--border-strong)"}`,
                    background: listening ? "color-mix(in srgb, var(--magenta) 10%, transparent)" : "var(--panel)",
                    color: "var(--text)",
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: listening ? "var(--magenta)" : "var(--grad-gemini)", boxShadow: listening ? "0 0 0 8px color-mix(in srgb, var(--magenta) 18%, transparent)" : "none", transition: "all .2s" }}>
                    {listening ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#0a0a0f" />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{listening ? "Listening… tap to stop" : "Tap to talk"}</span>
                </button>

                {transcript && (
                  <div style={{ padding: "11px 13px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-2)", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
                    {transcript}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Try saying</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SUGGESTIONS.map((s) => (
                      <div key={s} style={{ fontSize: 12.5, color: "var(--text-dim)", padding: "7px 10px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--border)" }}>
                        “{s}”
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
                  <KeyRound size={13} color="var(--accent-2)" /> Full voice (ElevenLabs STT/TTS) runs through your backend — the API key stays server-side.
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
